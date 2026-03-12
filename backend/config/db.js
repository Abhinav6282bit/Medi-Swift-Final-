const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4
        });
        console.log("------------------------------------");
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log("------------------------------------");
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        if (error.message.includes('SSL') || error.message.includes('alert 80')) {
            console.error('👉 TIP: This usually means your IP address is not whitelisted in MongoDB Atlas.');
            console.error('Please go to Atlas > Network Access > Add Current IP Address.');
        }
        process.exit(1);
    }
};

module.exports = connectDB;
