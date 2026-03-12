require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');

async function checkAppointments() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const apts = await Appointment.find().limit(20);
        console.log("--- Appointment Audit ---");
        apts.forEach(apt => {
            console.log(`Apt ID: ${apt._id}`);
            console.log(`  hospitalId: ${apt.hospitalId}`);
            console.log(`  hospitalName: ${apt.hospitalName}`);
            console.log(`  doctorId: ${apt.doctorId}`);
            console.log("-----------------------");
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkAppointments();
