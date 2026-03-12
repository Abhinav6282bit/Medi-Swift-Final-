const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Bed = require('./models/Bed');

const checkBeds = async () => {
    await connectDB();
    const hospitalMediId = 'MS-HOSP-XXXX';
    console.log("Checking beds for:", hospitalMediId);

    try {
        let beds = await Bed.find({ hospitalMediId });
        console.log("Current beds count:", beds.length);

        if (beds.length === 0) {
            console.log("Initializing beds...");
            const newBeds = [];
            for (let i = 1; i <= 20; i++) {
                newBeds.push({ hospitalMediId, ward: 'General', bedNumber: `GN-${i}`, status: 'Available' });
            }
            for (let i = 1; i <= 10; i++) {
                newBeds.push({ hospitalMediId, ward: 'ICU', bedNumber: `ICU-${i}`, status: 'Available' });
            }
            for (let i = 1; i <= 5; i++) {
                newBeds.push({ hospitalMediId, ward: 'Maternity', bedNumber: `MT-${i}`, status: 'Available' });
            }
            const inserted = await Bed.insertMany(newBeds);
            console.log("Successfully inserted beds count:", inserted.length);
        }
    } catch (err) {
        console.error("Error during bed operations:", err);
    } finally {
        // mongoose.connection.close();
        process.exit();
    }
};

checkBeds();
