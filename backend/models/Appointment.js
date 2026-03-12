const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: String,
    patientName: String,
    doctorId: String,
    doctorName: String,
    speciality: String,
    hospitalId: String,
    hospitalName: String,
    date: Date,
    time: String,
    status: { type: String, default: 'Pending' },
    token: Number,
    diagnosis: { type: String, default: '' },
    medicines: { type: [String], default: [] },
    labTests: { type: String, default: '' },
    labStatus: { type: String, default: 'Pending' },
    labResultSummary: { type: String, default: '' },
    verificationCode: { type: String, default: '' },
    reportUrl: { type: String, default: '' },
    isPaid: { type: Boolean, default: false },
    paymentMethod: { type: String, default: '' },
    availableMedicines: { type: [String], default: [] },
    nextAppointmentDate: { type: String, default: '' },
    admissionDate: { type: String, default: '' },
    expectedDischargeDate: { type: String, default: '' },
    isAdmitted: { type: Boolean, default: false },
    assignedBed: { type: String, default: '' },
    assignedWard: { type: String, default: '' },
    sendToPharmacy: { type: Boolean, default: false },
    sendToLab: { type: Boolean, default: false },
    followUpNotes: { type: String, default: '' },
    // IPD Billing Flow Fields
    dischargeRequested: { type: Boolean, default: false },
    ipdBillAmount: { type: Number, default: 0 },
    ipdBillStatus: { type: String, default: 'None', enum: ['None', 'Generated', 'Pending_COD', 'Paid'] },
    dischargeDate: { type: Date }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
