const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
    requesterId: { type: String, required: true },
    requesterName: { type: String, required: true },
    hospitalName: { type: String, required: true },
    donorId: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    donationTime: { type: String, default: '' },        // Preferred donation time by requester
    status: { type: String, enum: ['Pending', 'Accepted', 'Ignored'], default: 'Pending' },
    tokenNumber: { type: Number },                      // Sequential token per hospital
    ignoredBy: [{ type: String }],                      // requesterIds ignored by this donor
    bloodReceived: { type: Boolean, default: false },   // Hospital marks after donation
    bloodReceivedAt: { type: Date },
    requestDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
