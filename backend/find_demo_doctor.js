require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function findDoctor() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const doctor = await User.findOne({ mediId: 'MS-DOCT-6491' });
        if (doctor) {
            console.log(`Found Doctor: ${doctor.firstName} | Medi-ID: ${doctor.mediId} | Password: ${doctor.password}`);
        } else {
            console.log("Doctor not found.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findDoctor();
