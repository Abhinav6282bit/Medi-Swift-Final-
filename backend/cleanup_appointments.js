require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');

const MONGO_URI = process.env.MONGO_URI;

async function cleanup() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const res = await Appointment.deleteMany({ doctorId: { $exists: false } });
        console.log(`🗑️ Deleted ${res.deletedCount} broken appointments (missing doctorId).`);

        // Also delete any where doctorId is null or empty string just in case
        const res2 = await Appointment.deleteMany({ doctorId: "" });
        console.log(`🗑️ Deleted ${res2.deletedCount} empty doctorId appointments.`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

cleanup();
