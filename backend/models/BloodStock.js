const mongoose = require('mongoose');

const bloodStockSchema = new mongoose.Schema({
    bloodBankId: { type: String, required: true },   // The mediId of the Blood Bank
    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    units: { type: Number, default: 0 },             // Available units in ml or bags
    lastUpdated: { type: Date, default: Date.now }
});

// Compound unique: one record per blood group per blood bank
bloodStockSchema.index({ bloodBankId: 1, bloodGroup: 1 }, { unique: true });

module.exports = mongoose.model('BloodStock', bloodStockSchema);
