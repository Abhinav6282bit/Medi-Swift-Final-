const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    role: { type: String, required: true },
    mediId: { type: String, unique: true },
    password: { type: String },
    securityKey: { type: String, default: 'swift-admin-2026' },
    hospitalName: String,
    labName: String,
    pharmacyName: String,
    bloodBankName: String,
    driverName: String,
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    licenseNo: String,
    address: String,
    specialization: String,
    generalBeds: { type: Number, default: 20 },
    icuBeds: { type: Number, default: 10 },
    maternityBeds: { type: Number, default: 5 },
    status: { type: String, default: 'active' },
    isOnline: { type: Boolean, default: false },
    currentLocation: { lat: Number, lng: Number },
    otp: { type: String },
    otpExpires: { type: Date },
    aadharNumber: { type: String, unique: true, sparse: true },
    age: Number,
    gender: String,
    dob: String,
    photoUrl: { type: String },
    hospitalMediId: String, // Links staff to their hospital
    customWards: [{
        name: { type: String, required: true },
        count: { type: Number, default: 0 }
    }],
    medicalHistory: { type: String, default: '' }
});

module.exports = mongoose.model('User', userSchema);