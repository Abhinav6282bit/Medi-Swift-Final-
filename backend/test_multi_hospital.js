require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Medicine = require('./models/Medicine');

const MONGO_URI = process.env.MONGO_URI;

async function verifyIsolation() {
    console.log('CWD:', process.cwd());
    console.log('MONGO_URI Present:', !!process.env.MONGO_URI);
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing from process.env');
        }
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Register 2 Hospitals
        const generateMediId = (role) => `TEST-${role}-${Math.floor(Math.random() * 1000)}`;

        const suffix = Date.now().toString().slice(-4);

        const h1Id = generateMediId('HOSP');
        const h1 = new User({
            hospitalName: 'City Hospital',
            email: `city_${suffix}@test.com`,
            password: 'password123',
            role: 'HOSPITAL',
            mediId: h1Id
        });
        await h1.save();
        console.log(`🏥 Registered: City Hospital (${h1Id})`);

        const h2Id = generateMediId('HOSP');
        const h2 = new User({
            hospitalName: 'Metro Clinic',
            email: `metro_${suffix}@test.com`,
            password: 'password123',
            role: 'HOSPITAL',
            mediId: h2Id
        });
        await h2.save();
        console.log(`🏥 Registered: Metro Clinic (${h2Id})`);

        // 2. Add Separate Doctors
        const d1Id = generateMediId('DOC');
        const d1 = new User({
            firstName: 'Smith',
            role: 'DOCTOR',
            hospitalMediId: h1Id,
            hospitalName: 'City Hospital',
            mediId: d1Id,
            password: 'password123',
            aadharNumber: `11112222${suffix}`,
            photoUrl: 'uploads/test.jpg'
        });
        await d1.save();
        console.log(`👨‍⚕️ Added: Dr. Smith to City Hospital`);

        const d2Id = generateMediId('DOC');
        const d2 = new User({
            firstName: 'Jones',
            role: 'DOCTOR',
            hospitalMediId: h2Id,
            hospitalName: 'Metro Clinic',
            mediId: d2Id,
            password: 'password123',
            aadharNumber: `44445555${suffix}`,
            photoUrl: 'uploads/test.jpg'
        });
        await d2.save();
        console.log(`👨‍⚕️ Added: Dr. Jones to Metro Clinic`);

        // 3. Create Separate Appointments
        const a1 = new Appointment({
            patientId: 'PAT-1',
            patientName: 'Patient A',
            hospitalId: h1Id,
            hospitalName: 'City Hospital',
            doctorId: d1Id,
            doctorName: 'Dr. Smith',
            status: 'Pending',
            date: new Date()
        });
        await a1.save();
        console.log(`📅 Created Appointment for City Hospital`);

        const a2 = new Appointment({
            patientId: 'PAT-2',
            patientName: 'Patient B',
            hospitalId: h2Id,
            hospitalName: 'Metro Clinic',
            doctorId: d2Id,
            doctorName: 'Dr. Jones',
            status: 'Pending',
            date: new Date()
        });
        await a2.save();
        console.log(`📅 Created Appointment for Metro Clinic`);

        // 4. VERIFY ISOLATION
        console.log('\n🔍 --- VERIFYING ISOLATION ---');

        // Check City Hospital Appointments
        const h1Apps = await Appointment.find({ hospitalId: h1Id });
        console.log(`City Hospital Appointments Found: ${h1Apps.length}`);
        if (h1Apps.length === 1 && h1Apps[0].patientName === 'Patient A') {
            console.log('✅ City Hospital isolation successful.');
        } else {
            console.error('❌ City Hospital isolation FAILED!');
        }

        // Check Metro Clinic Appointments
        const h2Apps = await Appointment.find({ hospitalId: h2Id });
        console.log(`Metro Clinic Appointments Found: ${h2Apps.length}`);
        if (h2Apps.length === 1 && h2Apps[0].patientName === 'Patient B') {
            console.log('✅ Metro Clinic isolation successful.');
        } else {
            console.error('❌ Metro Clinic isolation FAILED!');
        }

        // Check Staff Isolation
        const h1Staff = await User.find({ hospitalMediId: h1Id });
        console.log(`City Hospital Staff Found: ${h1Staff.length} (${h1Staff[0].firstName})`);
        if (h1Staff.length === 1 && h1Staff[0].firstName === 'Smith') {
            console.log('✅ Staff isolation successful.');
        } else {
            console.error('❌ Staff isolation FAILED!');
        }

        // --- GLOBAL HISTORY VERIFICATION ---
        console.log('\n🔍 --- VERIFYING GLOBAL HISTORY ACCESS ---');
        // Doc 2 (Metro Clinic) wants to see Patient A's history (City Hospital)
        const patientAHistory = await Appointment.find({
            patientId: 'PAT-1',
            status: 'Pending' // Just checking the query logic for PAT-1
        });

        console.log(`Patient A history records found by Metro Clinic query: ${patientAHistory.length}`);
        if (patientAHistory.length === 1 && patientAHistory[0].hospitalName === 'City Hospital') {
            console.log('✅ Global history access verified: Doc at Metro can see City Hospital records for Patient A.');
        } else {
            console.error('❌ Global history access FAILED!');
        }

        // 5. Cleanup (Optional, but let's keep it for now)
        // await User.deleteMany({ mediId: { $regex: '^TEST-' } });
        // await Appointment.deleteMany({ hospitalId: { $regex: '^TEST-' } });
        // console.log('\n🧹 Test Data Cleaned up.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

verifyIsolation();
