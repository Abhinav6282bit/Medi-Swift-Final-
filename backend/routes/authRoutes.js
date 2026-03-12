const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

const systemController = require('../controllers/systemController');
const hospitalController = require('../controllers/hospitalController');

router.post('/login', authController.login);
router.post('/register-hospital', authController.registerHospital);
router.post('/register-user', upload.single('photo'), authController.registerUser);
router.post('/send-otp', authController.sendOtp);
router.post('/reset-password', authController.resetPassword);

// --- ADMIN / PERSONNEL MANAGEMENT ---
router.post('/hospital/add-personnel', upload.single('photo'), authController.addHospitalPersonnel);
router.put('/hospital/update-personnel/:mediId', upload.single('photo'), authController.updateHospitalPersonnel);
router.put('/hospital/toggle-status/:mediId', authController.togglePersonnelStatus);
router.post('/admin/register-blood-bank', authController.registerBloodBank);
router.delete('/admin/remove-personnel/:mediId', authController.removeHospitalPersonnel);
router.post('/hospital/delete-ward', hospitalController.deleteWard);
router.post('/hospital/update-capacity', hospitalController.updateHospitalCapacity);

// --- DASHBOARD & SYSTEM ROUTES ---
router.get('/hospital-staff', systemController.getHospitalStaff);
router.get('/search-patient/:id', systemController.searchPatient);
router.post('/book-appointment', systemController.bookAppointment);
router.post('/ai-match-doctor', systemController.aiMatchDoctor);
router.get('/get-hospital-appointments/:hospitalId', systemController.getHospitalAppointments);
router.put('/update-appointment-status/:id', systemController.updateAppointmentStatus);
router.get('/get-records', systemController.getRecords);
router.post('/add-record', systemController.addRecord);
router.get('/patient-history/:patientId', systemController.getPatientHistory);
router.get('/patient-profile/:patientId', systemController.getPatientProfile);
router.post('/complete-session', systemController.completeSession);
router.get('/get-hospital-labs/:hospitalId', systemController.getHospitalLabs);
router.put('/update-lab-status', systemController.updateLabStatus);
router.get('/get-patient-prescriptions/:patientId', systemController.getPatientPrescriptions);
router.get('/patient-active-appointment/:patientId', systemController.getPatientActiveAppointment);
router.get('/doctor-live-status/:doctorId', systemController.getDoctorLiveStatus);

// --- EMERGENCY & AMBULANCE ---
router.post('/emergency/trigger-sos', systemController.triggerSOS);
router.put('/emergency/cancel/:id', systemController.cancelSOS);
router.get('/emergency/status/:id', systemController.getEmergencyStatus);
router.get('/ambulance/check-emergency/:mediId', systemController.checkAmbulanceRequests);
router.put('/ambulance/toggle-status/:mediId', systemController.toggleAmbulanceStatus);
router.put('/emergency/accept/:id', systemController.acceptEmergency);
router.put('/emergency/reached-pickup/:id', systemController.markReachedPickup);
router.put('/emergency/severity/:id', systemController.setEmergencySeverity);
router.put('/emergency/update-location/:id', systemController.updateEmergencyLocation);
router.put('/emergency/complete/:id', systemController.completeEmergency);
router.get('/ambulance/history/:mediId', systemController.getAmbulanceHistory);

// --- PHARMACY ---
router.get('/pharmacy/prescriptions/:hospitalId', systemController.getPharmacyPrescriptions);
router.get('/pharmacy/stock/:hospitalId', systemController.getPharmacyStock);
router.post('/pharmacy/add-stock', systemController.addPharmacyStock);
router.put('/pharmacy/update-stock', systemController.updatePharmacyOrderStock);
router.post('/pharmacy/set-preparing', systemController.setPharmacyPreparing);
router.put('/pharmacy/prepare-order', systemController.preparePharmacyOrder);
router.post('/pharmacy/verify-cod', systemController.verifyPharmacyCOD);
router.post('/pharmacy/verify-pickup', systemController.verifyPharmacyPickup);
router.post('/patient/confirm-payment-intent', systemController.confirmPaymentIntent);
router.get('/pharmacy/transactions/:hospitalId', systemController.getPharmacyTransactions);
router.put('/pharmacy/bulk-deduct-stock', systemController.bulkDeductStock);

// --- LAB REPORTS ---
router.post('/upload-lab-report', systemController.upload.single('report'), systemController.uploadLabReport);

// --- PATIENT NOTIFICATIONS ---
router.get('/patient/notifications/:patientId', systemController.getPatientNotifications);
router.put('/patient/notifications/mark-read/:patientId', systemController.markNotificationsRead);
router.delete('/notifications/:id', systemController.deleteNotification);
router.delete('/notifications/clear-all/:targetId', systemController.clearAllNotifications);
router.get('/hospital/notifications/:hospitalId', systemController.getHospitalNotifications);

// --- ADMISSION & PRE-BOOKING ---
router.post('/pre-booking/request', systemController.submitPreBookingRequest);
router.post('/admission/request', systemController.submitAdmissionRequest);
router.post('/admission/allot-bed', systemController.allotBed);
router.get('/doctor/ipd-patients/:doctorId', systemController.getDoctorIPDPatients);

// --- BLOOD DONATION ---
router.get('/blood-donation/status/:patientId', systemController.getBloodDonationStatus);
router.post('/blood-donation/register', systemController.registerBloodDonation);
router.get('/blood-donation/donors', systemController.getAllDonors);
router.post('/blood-donation/toggle/:patientId', systemController.toggleDonorStatus);

// --- BLOOD REQUESTS ---
router.post('/blood-request/send', systemController.sendBloodRequest);
router.get('/blood-request/incoming/:donorId', systemController.getIncomingBloodRequests);
router.get('/blood-request/outgoing/:requesterId', systemController.getOutgoingBloodRequests);
router.put('/blood-request/update/:id', systemController.updateBloodRequestStatus);
router.put('/blood-request/mark-received/:id', systemController.markBloodReceived);
router.get('/blood-request/hospital/:hospitalId', systemController.getBloodRequestsForHospital);

// --- BLOOD BANK ---
router.get('/blood-bank/inventory/:bloodBankId', systemController.getBloodBankInventory);
router.put('/blood-bank/update-stock', systemController.updateBloodStock);
router.get('/blood-bank/all', systemController.getAllBloodBanks);

// Compatibility alias for Patient Dashboard
router.get('/get-all-hospitals', async (req, res) => {
    const User = require('../models/User');
    const hospitals = await User.find({ role: 'HOSPITAL' });
    res.json(hospitals);
});

// IPD Discharge and Billing Flow
router.post('/discharge/request/:id', systemController.requestDischarge);
router.post('/discharge/generate-bill/:id', systemController.generateIPDBill);
router.post('/discharge/pay/:id', systemController.payIPDBill);
router.post('/discharge/confirm-cod/:id', systemController.confirmCODPayment);

module.exports = router;
