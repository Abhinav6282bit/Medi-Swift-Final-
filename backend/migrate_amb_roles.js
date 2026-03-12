const mongoose = require('mongoose');
require('dotenv').config();

const migrateAmbulanceRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medi-swift');
        console.log('Connected to MongoDB');

        const User = require('./models/User');

        const result = await User.updateMany(
            { role: 'AMB' },
            { $set: { role: 'AMBULANCE' } }
        );

        console.log(`Migration Complete: ${result.modifiedCount} users updated from AMB to AMBULANCE.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrateAmbulanceRoles();
