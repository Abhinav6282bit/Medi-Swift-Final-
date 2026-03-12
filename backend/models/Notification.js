const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    patientId: { type: String, index: true },
    hospitalId: { type: String, index: true }, // For hospital-targeted notifications
    type: {
        type: String,
        enum: [
            'appointment_booked', 'session_completed', 'lab_update',
            'pharmacy_preparing', 'pharmacy_ready',
            'blood_request_accepted', 'blood_donation_incoming', 'blood_received',
            'pre_booking_request', 'bed_allocation_request', 'bed_allocated', 'urgent_admission_request'
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
