require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');

const MONGO_URI = process.env.MONGO_URI;

const oldPrefixes = ['MS-PHA-', 'MS-PHARM-', 'MS-PHARMACY-', 'MS-AMB-', 'MS-AMBULANCE-', 'MS-PAT-', 'MS-PATE-', 'MS-DOC-', 'MS-DOCTOR-'];
const newPrefixes = ['MS-PHAR-', 'MS-AMBU-', 'MS-PATI-', 'MS-DOCT-'];

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('--- USER COLLECTION ---');
        for (const prefix of oldPrefixes) {
            const count = await User.countDocuments({ mediId: new RegExp('^' + prefix) });
            if (count > 0) console.log(`FAIL: Found ${count} users with old prefix ${prefix}`);
        }
        for (const prefix of newPrefixes) {
            const count = await User.countDocuments({ mediId: new RegExp('^' + prefix) });
            console.log(`INFO: Found ${count} users with new prefix ${prefix}`);
        }

        console.log('--- APPOINTMENT COLLECTION ---');
        for (const prefix of oldPrefixes) {
            const count = await Appointment.countDocuments({ 
                $or: [
                    { patientId: new RegExp('^' + prefix) },
                    { doctorId: new RegExp('^' + prefix) },
                    { hospitalId: new RegExp('^' + prefix) }
                ]
            });
            if (count > 0) console.log(`FAIL: Found ${count} appointments with old prefix ${prefix}`);
        }

        console.log('--- SPECIFIC CHECK ---');
        // Let's find one user and see their ID
        const oneUser = await User.findOne({ role: 'AMBULANCE' });
        if (oneUser) {
            console.log(`Example Ambulance User Medi-ID: ${oneUser.mediId}`);
        }

        const onePatient = await User.findOne({ role: 'PATIENT' });
        if (onePatient) {
            console.log(`Example Patient Medi-ID: ${onePatient.mediId}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
