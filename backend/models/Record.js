const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    vault: { type: String, required: true }, // 'hospital', 'lab', 'pharmacy'
    hospitalMediId: String, // For multi-hospital isolation
    hospitalName: String, // Added for identity resilience
    name: String,
    photoUrl: String, // For profile photo display
    detail: String,
    contact: String,
    email: String,
    mediId: String,
    category: { type: String },
    count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', recordSchema);
