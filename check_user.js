const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const User = require('./backend/models/User');

const check = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");
        
        const mediId = "MS-DOCT-6491";
        console.log(`Searching for: ${mediId}`);
        
        const user = await User.findOne({ 
            $or: [
                { mediId: { $regex: new RegExp("^MS-DOCT-6491$", "i") } },
                { mediId: { $regex: new RegExp("^MS-DOC-6491$", "i") } }
            ]
        });
        
        if (user) {
            console.log("User Found:");
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log("User NOT Found.");
            // List all doctors to see if there's a similar ID
            const doctors = await User.find({ role: 'DOCTOR' }).limit(10);
            console.log("Recent Doctors:");
            doctors.forEach(d => console.log(`- ${d.mediId} (${d.firstName})`));
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

check();
