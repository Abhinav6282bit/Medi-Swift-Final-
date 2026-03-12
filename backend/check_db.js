const mongoose = require('mongoose');
const User = require('./models/User');
const BloodRequest = require('./models/BloodRequest');
const BloodStock = require('./models/BloodStock');

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/medi-swift');
        console.log('Connected to DB');

        const banks = await User.find({ role: 'BLOOD_BANK' });
        console.log('Blood Banks Found:', banks.length);
        banks.forEach(b => console.log(`- ${b.mediId} (${b.bloodBankName})`));

        const recentRequests = await BloodRequest.find({ status: 'Accepted' }).sort({ requestDate: -1 }).limit(5);
        console.log('Recent Accepted Requests:', recentRequests.length);
        for (const req of recentRequests) {
            console.log(`- Req ID: ${req._id}, Donor: ${req.donorId}, Group: ${req.bloodGroup}, Date: ${req.requestDate}`);
            const donor = await User.findOne({ mediId: req.donorId });
            console.log(`  Donor Role: ${donor ? donor.role : 'NOT FOUND'}`);

            if (donor && donor.role === 'BLOOD_BANK') {
                const stock = await BloodStock.findOne({ bloodBankId: donor.mediId, bloodGroup: req.bloodGroup });
                console.log(`  Target Stock: ${stock ? stock.units : 'NOT FOUND'}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
