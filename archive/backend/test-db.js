const mongoose = require('mongoose');

const uri = "mongodb://abhinavakku62_db_user:wDc30Qhej1LYLz3k@ac-fczk26a-shard-00-00.7cnkiy2.mongodb.net:27017/medi-swift?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true";

async function run() {
    console.log("Connecting to:", uri);
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000
        });
        console.log("Mongoose connected successfully");

        console.log("Attempting to count documents...");
        const count = await mongoose.connection.db.collection('users').countDocuments();
        console.log("Count successful:", count);

        console.log("Attempting a simple findOne...");
        const doc = await mongoose.connection.db.collection('users').findOne({});
        console.log("FindOne successful:", doc ? doc._id : "None");

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
        process.exit();
    }
}

run();
