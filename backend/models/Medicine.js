const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    hospitalName: String,
    name: { type: String, required: true },
    qty: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    category: { type: String, default: 'Tablet' },
    minQty: { type: Number, default: 5 },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Medicine', medicineSchema);
