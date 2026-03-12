const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
    hospitalMediId: { type: String, required: true },
    ward: { type: String, required: true },
    bedNumber: { type: String, required: true },
    status: { type: String, enum: ['Available', 'Reserved', 'Occupied'], default: 'Available' },
    patientName: { type: String, default: null },
    patientId: { type: String, default: null }
});

module.exports = mongoose.model('Bed', bedSchema);
