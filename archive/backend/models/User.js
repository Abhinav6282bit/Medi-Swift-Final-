const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    role: { type: String, required: true, enum: ['PAT', 'LAB', 'PHA', 'AMB', 'HOSPITAL'] },
    mediId: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    status: { type: String, default: 'pending' }, // Admin must approve
    
    // Shared Fields
    phone: String,
    address: String,
    email: String,

    // Patient Specific
    firstName: String,
    lastName: String,
    gender: String,
    dob: Date,

    // Entity Specific (Lab, Pharmacy, Ambulance)
    entityName: String, 
    licenseNo: String,
    vehicleNo: String,
    rcNumber: String,
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);