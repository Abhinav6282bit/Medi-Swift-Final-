const mongoose = require('mongoose');

const bloodDonationSchema = new mongoose.Schema({
    patientId: { type: String, required: true, unique: true },
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    gender: String,
    age: Number,
    bloodGroup: { type: String, required: true },
    weight: Number,
    lastDonationDate: String,
    medicalQuestions: {
        chronicConditions: { type: Boolean, default: false },
        recentSurgery: { type: Boolean, default: false },
        recentTattoo: { type: Boolean, default: false },
        onMedication: { type: Boolean, default: false },
        infectiousDiseases: { type: Boolean, default: false }
    },
    consent: { type: Boolean, required: true },
    isActive: { type: Boolean, default: true }, // Stop / Resume donation
    registrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodDonation', bloodDonationSchema);
