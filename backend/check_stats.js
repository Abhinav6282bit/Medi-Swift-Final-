require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

async function checkStats() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const hospitals = await User.find({ role: 'HOSPITAL' });
        console.log(`🏥 Found ${hospitals.length} Hospitals:`);

        for (const h of hospitals) {
            const docCount = await User.countDocuments({
                role: 'DOCTOR',
                hospitalMediId: h.mediId
            });
            console.log(` - ${h.hospitalName} (${h.mediId}) has ${docCount} doctors.`);
        }

        const orphanDocs = await User.countDocuments({
            role: 'DOCTOR',
            hospitalMediId: { $exists: false }
        });
        console.log(`⚠️ Orphan Doctors (no hospital link): ${orphanDocs}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkStats();
