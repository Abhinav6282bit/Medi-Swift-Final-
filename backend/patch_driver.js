const mongoose = require('mongoose');
require('dotenv').config();

const patchAmbulanceDriver = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medi-swift');
        console.log('Connected to MongoDB');

        const User = require('./models/User');

        // Update the driver name for the specific record
        const result = await User.updateOne(
            { mediId: 'MS-AMB-7993' },
            { $set: { driverName: 'Rajesh' } }
        );

        console.log(`Patch Complete: ${result.modifiedCount} users updated.`);
        process.exit(0);
    } catch (err) {
        console.error('Patch failed:', err);
        process.exit(1);
    }
};

patchAmbulanceDriver();
