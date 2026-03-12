require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

async function find() {
    await connectDB();
    const user = await User.findOne({ mediId: /6491/ });
    console.log('User Found:', user ? { name: user.firstName || user.hospitalName, role: user.role, mediId: user.mediId } : 'None');
    process.exit();
}
find();
