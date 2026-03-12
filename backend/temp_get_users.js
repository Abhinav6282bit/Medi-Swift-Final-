require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function getUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ role: { $ne: 'PATIENT' } });
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getUsers();
