const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    requesterId: String,
    requesterName: String,
    location: { lat: Number, lng: Number, address: String, accuracy: Number, altitude: Number },
    emergencyType: { type: String, default: 'General' },
    ambulanceId: String,
    driverName: String,
    ambulanceLocation: { lat: Number, lng: Number },
    driverPhone: String,
    status: {
        type: String,
        enum: ['Searching', 'Accepted', 'OnWay', 'Arrived', 'EnRouteHospital', 'Completed'],
        default: 'Searching'
    },
    isSerious: { type: Boolean, default: false },
    hospitalId: String,
    hospitalName: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Emergency', emergencySchema);
