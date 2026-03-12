require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const BloodRequest = require('./models/BloodRequest');
const BloodStock = require('./models/BloodStock');

async function check() {
    try {
        console.log('Connecting to Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const banks = await User.find({ role: 'BLOOD_BANK' });
        console.log(`Blood Banks Found: ${banks.length}`);
        banks.forEach(b => console.log(`- ${b.mediId} | Role: ${b.role} | Name: ${b.bloodBankName}`));

        const recent = await BloodRequest.find({ status: 'Accepted' }).sort({ requestDate: -1 }).limit(1);
        if (recent.length > 0) {
            const req = recent[0];
            console.log(`\nMost Recent Accepted Request:`);
            console.log(`- Donor ID: ${req.donorId}`);
            console.log(`- Blood Group: ${req.bloodGroup}`);

            const donor = await User.findOne({ mediId: req.donorId });
            console.log(`- Donor Found in User Table: ${donor ? 'YES' : 'NO'}`);
            if (donor) {
                console.log(`- Donor Role: ${donor.role}`);
                const stock = await BloodStock.findOne({ bloodBankId: donor.mediId, bloodGroup: req.bloodGroup });
                console.log(`- Current Stock in DB for this group: ${stock ? stock.units : 'STOCK RECORD NOT FOUND'}`);
            }
        } else {
            console.log('\nNo Accepted requests found.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

check();
