const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Record = require('../models/Record');
const Medicine = require('../models/Medicine');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const BloodDonation = require('../models/BloodDonation');
const BloodStock = require('../models/BloodStock');
const Bed = require('../models/Bed');
const { matchSymptoms } = require('../utils/symptomMatcher');
const notificationService = require('../utils/notificationService');

// Configure Multer for Lab Report Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `lab-report-${Date.now()}${path.extname(file.originalname)}`);
    }
});
exports.upload = multer({ storage });


// --- PATIENT SEARCH ---
// --- PATIENT SEARCH ---
exports.searchPatient = async (req, res) => {
    try {
        const query = req.params.id;
        // Search by mediId OR partial name match
        const patients = await User.find({
            role: 'PATIENT',
            $or: [
                { mediId: query },
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } }
            ]
        }).limit(10); // Limit results for efficiency

        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: "No patients found" });
        }

        // If searching by exact ID, return single object for compatibility, 
        // otherwise return the array (frontend will handle both)
        if (patients.length === 1 && patients[0].mediId === query) {
            return res.json({ success: true, patient: patients[0], patients });
        }

        res.json({ success: true, patients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- APPOINTMENTS ---
exports.bookAppointment = async (req, res) => {
    try {
        const { hospitalId, hospitalName, patientId, doctorId, date } = req.body;

        // Ensure we have both ID and Name if possible
        let hId = hospitalId;
        let hName = hospitalName;

        if (hId && !hName) {
            const hosp = await User.findOne({ mediId: hId, role: 'HOSPITAL' });
            if (hosp) hName = hosp.hospitalName;
        } else if (!hId && hName) {
            const hosp = await User.findOne({ hospitalName: hName, role: 'HOSPITAL' });
            if (hosp) hId = hosp.mediId;
        }

        // Generate sequential token per doctor/date
        const lastApt = await Appointment.findOne({ doctorId, date }).sort({ token: -1 });
        const token = lastApt ? lastApt.token + 1 : 1;

        const newApt = new Appointment({
            ...req.body,
            hospitalId: hId,
            hospitalName: hName,
            token,
            status: 'Waiting'
        });
        await newApt.save();

        // Fire-and-forget notification
        const notifTitle = 'Appointment Confirmed';
        const notifMessage = `Token #${token} at ${hName || 'Hospital'} with Dr. ${req.body.doctorName || 'Doctor'} on ${new Date(date).toLocaleDateString()}`;
        
        Notification.create({
            patientId: patientId,
            type: 'appointment_booked',
            title: notifTitle,
            message: notifMessage
        }).catch(err => console.error('Notification error:', err));

        notificationService.sendNotificationEmail(patientId, 'appointment_booked', notifTitle, notifMessage)
            .catch(err => console.error('Email notification error:', err));

        res.status(201).json({ success: true, appointment: newApt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getHospitalAppointments = async (req, res) => {
    try {
        const hospitalQuery = req.params.hospitalId;
        const appointments = await Appointment.find({
            $or: [{ hospitalId: hospitalQuery }, { hospitalName: hospitalQuery }]
        }).sort({ date: 1, token: 1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const apt = await Appointment.findById(req.params.id);
        if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

        // If discharging (Admitted -> Completed), free the bed
        if (status === 'Completed' && apt.isAdmitted && apt.assignedBed) {
            const bed = await Bed.findOne({
                hospitalMediId: apt.hospitalId,
                bedNumber: apt.assignedBed,
                ward: apt.assignedWard
            });
            if (bed) {
                bed.status = 'Available';
                bed.patientId = null;
                bed.patientName = null;
                await bed.save();
            }
            apt.isAdmitted = false; // mark as no longer admitted
        }

        apt.status = status;
        if (req.body.admissionDate) apt.admissionDate = req.body.admissionDate;

        await apt.save();
        res.json({ success: true, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- RECORDS (Personnel/Doctors/Nurses etc. for Hospital) ---
exports.getRecords = async (req, res) => {
    try {
        const { vault, hospitalMediId } = req.query;
        // isolation: filter by hospitalMediId or name if provided
        const query = { vault };
        if (hospitalMediId) {
            query.$or = [{ hospitalMediId }, { hospitalName: hospitalMediId }];
        }

        const records = await Record.find(query);
        res.json(records);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addRecord = async (req, res) => {
    try {
        const { hospitalMediId, hospitalName } = req.query;
        const newRecord = new Record({
            ...req.body,
            vault: req.query.vault,
            hospitalMediId: hospitalMediId,
            hospitalName: hospitalName || hospitalMediId // Fallback to ID if name not explicit
        });
        await newRecord.save();
        res.json({ success: true, record: newRecord });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAFF LISTING FOR HOSPITAL DASHBOARD (Users model) ---
exports.getHospitalStaff = async (req, res) => {
    try {
        const { hospitalMediId, role } = req.query;
        if (!hospitalMediId) return res.status(400).json({ success: false, message: "hospitalId required" });

        const query = {
            $or: [{ hospitalMediId }, { hospitalName: hospitalMediId }]
        };
        if (role) query.role = role.toUpperCase();

        const staff = await User.find(query);
        res.json(staff);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- PATIENT HISTORY & LABS ---
exports.getPatientHistory = async (req, res) => {
    try {
        const history = await Appointment.find({
            patientId: req.params.patientId,
            status: { $in: ['Completed', 'Preparing', 'Ready for Pickup', 'Collected'] }
        }).sort({ date: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPatientProfile = async (req, res) => {
    try {
        const patient = await User.findOne({ mediId: req.params.patientId, role: 'PATIENT' });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.json({ success: true, patient });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.completeSession = async (req, res) => {
    try {
        console.log("--- COMPLETE SESSION REQUEST ---");
        console.log("Body:", JSON.stringify(req.body, null, 2));

        const { appointmentId, diagnosis, medicines, labTests, nextAppointmentDate, followUpInstructions, sendToPharmacy, sendToLab, medicalHistory } = req.body;

        if (!appointmentId) return res.status(400).json({ success: false, message: "appointmentId is required" });

        // Robust medicines parsing (handle string or array)
        let medicinesArray = [];
        if (Array.isArray(medicines)) {
            medicinesArray = medicines;
        } else if (typeof medicines === 'string' && medicines.trim() !== '') {
            medicinesArray = medicines.split(',').map(m => m.trim()).filter(m => m !== '');
        }

        const updateData = {
            status: 'Completed',
            diagnosis: diagnosis || '',
            medicines: medicinesArray,
            labTests: labTests || '',
            labStatus: (labTests && sendToLab) ? 'Requested' : 'N/A',
            nextAppointmentDate: nextAppointmentDate || '',
            followUpNotes: followUpInstructions || '',
            sendToPharmacy: !!sendToPharmacy,
            sendToLab: !!sendToLab
        };

        const apt = await Appointment.findByIdAndUpdate(appointmentId, updateData, { new: true });

        if (!apt) {
            console.log("Appointment not found for ID:", appointmentId);
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        // Update Patient's permanent Medical History in User model
        if (medicalHistory && apt.patientId) {
            await User.findOneAndUpdate(
                { mediId: apt.patientId, role: 'PATIENT' },
                { $set: { medicalHistory: medicalHistory } }
            );
        }

        console.log("Updated Appointment Result:", JSON.stringify(apt, null, 2));

        // Fire-and-forget notification to Patient
        const patientNotifTitle = 'Session Completed';
        const patientNotifMessage = `Diagnosis: ${diagnosis || 'N/A'}. ${medicinesArray.length > 0 && sendToPharmacy ? 'Prescription sent to pharmacy.' : ''} ${labTests && sendToLab ? 'Lab tests requested.' : ''} Check your EHR for details.`;
        
        Notification.create({
            patientId: apt.patientId,
            type: 'session_completed',
            title: patientNotifTitle,
            message: patientNotifMessage
        }).catch(err => console.error('Notification error:', err));

        notificationService.sendNotificationEmail(apt.patientId, 'session_completed', patientNotifTitle, patientNotifMessage)
            .catch(err => console.error('Email notification error:', err));

        // Conditional notification to Lab
        if (sendToLab && labTests) {
            Notification.create({
                hospitalId: apt.hospitalId,
                type: 'lab_update',
                title: 'New Lab Request',
                message: `New lab investigation requested for ${apt.patientName}.`
            }).catch(err => console.error('Lab Notification error:', err));
        }

        // Conditional notification to Pharmacy
        if (sendToPharmacy && medicinesArray.length > 0) {
            Notification.create({
                hospitalId: apt.hospitalId,
                type: 'pharmacy_preparing',
                title: 'New Prescription Received',
                message: `New prescription received for ${apt.patientName}.`
            }).catch(err => console.error('Pharmacy Notification error:', err));
        }

        res.json({ success: true, appointment: apt });
    } catch (err) {
        console.error("completeSession Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- LABS ---
exports.getHospitalLabs = async (req, res) => {
    try {
        const hospitalQuery = req.params.hospitalId;
        console.log(`[DEBUG] getHospitalLabs Query for: ${hospitalQuery}`);

        // Query by labStatus instead of appointment status so lab tasks
        // remain visible even after pharmacy changes appointment status
        const query = {
            $and: [
                { $or: [{ hospitalId: hospitalQuery }, { hospitalName: hospitalQuery }] },
                { sendToLab: true },
                { labTests: { $exists: true, $ne: '' } },
                { labStatus: { $in: ['Requested', 'Sample Collected', 'Completed'] } }
            ]
        };

        const labs = await Appointment.find(query).sort({ date: -1 });
        console.log(`[DEBUG] Found ${labs.length} labs.`);

        // Map fields to match LabDashboard expectations
        const mappedLabs = labs.map(lab => ({
            ...lab._doc,
            testNames: lab.labTests || '',
            patientMediId: lab.patientId,
            status: lab.labStatus // Override the main status with labStatus for the dashboard
        }));

        res.json(mappedLabs);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateLabStatus = async (req, res) => {
    try {
        const { orderId, status, results, reportUrl } = req.body;
        const updateData = {
            labStatus: status,
            labResultSummary: results
        };
        if (reportUrl) updateData.reportUrl = reportUrl;

        const apt = await Appointment.findByIdAndUpdate(orderId, updateData, { new: true });

        // Fire-and-forget notification
        if (apt) {
            const cleanResults = (results || '').replace(/\s*\(Ref:.*?\)\s*/g, '').trim();
            const labNotifTitle = 'Lab Results Updated';
            const labNotifMessage = `Status: ${status}. ${cleanResults ? cleanResults : 'Check your EHR for details.'}`;
            
            Notification.create({
                patientId: apt.patientId,
                type: 'lab_update',
                title: labNotifTitle,
                message: labNotifMessage
            }).catch(err => console.error('Notification error:', err));

            notificationService.sendNotificationEmail(apt.patientId, 'lab_update', labNotifTitle, labNotifMessage)
                .catch(err => console.error('Email notification error:', err));
        }

        res.json({ success: true, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- PHARMACY ---
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Appointment.find({
            patientId: req.params.patientId,
            medicines: { $exists: true, $ne: '' }
        });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- EMERGENCY & SOS ---
const Emergency = require('../models/Emergency');

exports.triggerSOS = async (req, res) => {
    try {
        const { requesterId, requesterName, lat, lng, accuracy, altitude, emergencyType } = req.body;
        const newEmergency = new Emergency({
            requesterId,
            requesterName,
            location: {
                lat,
                lng,
                address: "Nearby Location",
                accuracy,
                altitude
            },
            emergencyType: emergencyType || 'General',
            status: 'Searching'
        });
        await newEmergency.save();
        res.status(201).json({ success: true, emergency: newEmergency });
    } catch (err) {
        console.error("triggerSOS Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmergencyStatus = async (req, res) => {
    try {
        const emergency = await Emergency.findById(req.params.id);
        if (!emergency) return res.status(404).json({ success: false, message: "Emergency not found" });
        res.json({ success: true, status: emergency.status, emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkAmbulanceRequests = async (req, res) => {
    try {
        const { mediId } = req.params;
        // Priority 1: Check if this ambulance already has an active mission
        let mission = await Emergency.findOne({
            ambulanceId: mediId,
            status: { $in: ['Accepted', 'OnWay', 'Arrived'] }
        }).sort({ createdAt: -1 });

        // Priority 2: If no active mission, find the latest 'Searching' emergency
        if (!mission) {
            mission = await Emergency.findOne({
                status: 'Searching'
            }).sort({ createdAt: -1 });
        }

        res.json({ success: true, emergency: mission });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelSOS = async (req, res) => {
    try {
        const emergency = await Emergency.findByIdAndUpdate(
            req.params.id,
            { status: 'Cancelled' },
            { new: true }
        );
        if (!emergency) return res.status(404).json({ success: false, message: "Emergency not found" });
        res.json({ success: true, message: "SOS Cancelled successfully", emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleAmbulanceStatus = async (req, res) => {
    try {
        const { isOnline, lat, lng } = req.body;
        await User.findOneAndUpdate(
            { mediId: req.params.mediId },
            { isOnline, currentLocation: { lat, lng } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.acceptEmergency = async (req, res) => {
    try {
        const { ambulanceId, driverName, driverPhone, lat, lng } = req.body;

        // Prevent double acceptance
        const existing = await Emergency.findById(req.params.id);
        if (existing && existing.status !== 'Searching') {
            return res.status(400).json({ success: false, message: "Emergency already handled" });
        }

        const emergency = await Emergency.findByIdAndUpdate(req.params.id, {
            status: 'OnWay',
            ambulanceId,
            driverName,
            driverPhone,
            ambulanceLocation: { lat, lng }
        }, { new: true });
        res.json({ success: true, emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateEmergencyLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const emergency = await Emergency.findByIdAndUpdate(req.params.id, {
            ambulanceLocation: { lat, lng }
        }, { new: true });
        res.json({ success: true, emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.completeEmergency = async (req, res) => {
    try {
        await Emergency.findByIdAndUpdate(req.params.id, { status: 'Completed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markReachedPickup = async (req, res) => {
    try {
        const emergency = await Emergency.findByIdAndUpdate(req.params.id, { 
            status: 'Arrived' 
        }, { new: true });
        res.json({ success: true, emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.setEmergencySeverity = async (req, res) => {
    try {
        const { isSerious, hospitalId, hospitalName } = req.body;
        const updateData = { isSerious };
        
        if (isSerious) {
            updateData.hospitalId = hospitalId;
            updateData.hospitalName = hospitalName;
            updateData.status = 'EnRouteHospital';
        }

        const emergency = await Emergency.findByIdAndUpdate(req.params.id, updateData, { new: true });

        if (isSerious && hospitalId) {
            let allotmentInfo = "";
            let assignedDoctorName = "General Medicine Dept";

            // 1. Search for 'General Medicine' doctor
            const genMedDoc = await User.findOne({ 
                role: 'DOCTOR', 
                hospitalMediId: hospitalId,
                specialization: { $regex: /General Medicine/i },
                isOnline: true 
            });

            if (genMedDoc) {
                assignedDoctorName = `Dr. ${genMedDoc.firstName}`;
            }

            // 2. Search for 'Available' bed
            const freeBed = await Bed.findOne({ 
                hospitalMediId: hospitalId, 
                status: 'Available' 
            });

            if (freeBed) {
                freeBed.status = 'Reserved';
                freeBed.patientName = emergency.requesterName;
                freeBed.patientId = emergency.requesterId;
                await freeBed.save();
                allotmentInfo = `\nAllotted: ${freeBed.ward} - Bed ${freeBed.bedNumber}`;
            } else {
                allotmentInfo = `\n[NO BEDS AVAILABLE - MANUAL ALLOTMENT REQ]`;
            }

            // Priority 1: Notify the Hospital with detailed allotment info
            Notification.create({
                hospitalId: hospitalId,
                type: 'urgent_admission_request',
                title: 'CRITICAL: Incoming Emergency',
                message: `Serious ${emergency.emergencyType} case: ${emergency.requesterName}.\nDoctor Assigned: ${assignedDoctorName}${allotmentInfo}`
            }).catch(err => console.error('Hospital emergency notification error:', err));

            // Priority 2: Queue Jump & Allotment Update - Find patient's latest appointment
            const patientId = emergency.requesterId;
            let apt = await Appointment.findOne({ 
                patientId: patientId, 
                hospitalId: hospitalId,
                status: 'Waiting' 
            }).sort({ createdAt: -1 });

            // If no waiting appointment, create a phantom one for emergency tracking
            if (!apt) {
                apt = new Appointment({
                    patientId: patientId,
                    patientName: emergency.requesterName,
                    hospitalId: hospitalId,
                    hospitalName: hospitalName,
                    status: 'Waiting',
                    date: new Date(),
                    speciality: 'General Medicine'
                });
            }

            apt.token = 1; 
            apt.speciality = 'General Medicine';
            if (genMedDoc) {
                apt.doctorId = genMedDoc.mediId;
                apt.doctorName = genMedDoc.firstName;
            }
            if (freeBed) {
                apt.assignedBed = freeBed.bedNumber;
                apt.assignedWard = freeBed.ward;
                apt.isAdmitted = true;
            }
            await apt.save();
            
            console.log(`[EMERGENCY] Automated Allotment: Patient ${patientId} -> Doc: ${assignedDoctorName}, Bed: ${freeBed ? freeBed.bedNumber : 'None'}`);
        }

        res.json({ success: true, emergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- PHARMACY ---
exports.getPharmacyPrescriptions = async (req, res) => {
    try {
        const hospitalQuery = req.params.hospitalId;
        const prescriptions = await Appointment.find({
            $and: [
                { $or: [{ hospitalId: hospitalQuery }, { hospitalName: hospitalQuery }] },
                { sendToPharmacy: true },
                { $or: [{ status: 'Completed' }, { status: 'Preparing' }, { status: 'Ready for Pickup' }] },
                { medicines: { $exists: true, $not: { $size: 0 } } }
            ]
        }).sort({ date: -1 });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPharmacyStock = async (req, res) => {
    try {
        const hospitalQuery = req.params.hospitalId;
        const stock = await Medicine.find({
            $or: [{ hospitalId: hospitalQuery }, { hospitalName: hospitalQuery }]
        });
        res.json(stock);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addPharmacyStock = async (req, res) => {
    try {
        const { hospitalId, hospitalName, name } = req.body;

        // Resilient identity resolution
        let hId = hospitalId;
        let hName = hospitalName;

        if (hId && !hName) {
            const hosp = await User.findOne({
                $or: [{ mediId: hId }, { hospitalName: hId }],
                role: 'HOSPITAL'
            });
            if (hosp) {
                hId = hosp.mediId;
                hName = hosp.hospitalName;
            }
        } else if (!hId && hName) {
            const hosp = await User.findOne({ hospitalName: hName, role: 'HOSPITAL' });
            if (hosp) hId = hosp.mediId;
        }

        // Resilient lookup for existing stock
        const query = {
            $or: [{ hospitalId: hId }, { hospitalName: hId }],
            name: new RegExp(`^${name}$`, 'i')
        };
        let medicine = await Medicine.findOne(query);

        if (medicine) {
            medicine.qty += Number(req.body.qty);
            medicine.price = req.body.price;
            medicine.hospitalId = hId; // Synchronize ID
            medicine.hospitalName = hName; // Synchronize Name
            await medicine.save();
        } else {
            medicine = new Medicine({
                ...req.body,
                hospitalId: hId,
                hospitalName: hName || hId
            });
            await medicine.save();
        }
        res.json({ success: true, medicine });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePharmacyOrderStock = async (req, res) => {
    try {
        const { orderId, availableMedicines } = req.body;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAGE 1: NOTIFY PREPARING ---
exports.setPharmacyPreparing = async (req, res) => {
    try {
        const { orderId } = req.body;
        const apt = await Appointment.findByIdAndUpdate(orderId, { status: 'Preparing' }, { new: true });
        if (!apt) return res.status(404).json({ success: false, message: "Order not found" });
        console.log(`[PHARMACY] Stage 1: Order ${orderId} is now PREPARING.`);

        // Fire-and-forget notification
        const prepNotifTitle = 'Pharmacy Preparing';
        const prepNotifMessage = `Your medicines are being prepared at ${apt.hospitalName || 'the hospital'}. Please wait.`;
        
        Notification.create({
            patientId: apt.patientId,
            type: 'pharmacy_preparing',
            title: prepNotifTitle,
            message: prepNotifMessage
        }).catch(err => console.error('Notification error:', err));

        notificationService.sendNotificationEmail(apt.patientId, 'pharmacy_preparing', prepNotifTitle, prepNotifMessage)
            .catch(err => console.error('Email notification error:', err));

        res.json({ success: true, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAGE 2: SET READY FOR PICKUP ---
exports.preparePharmacyOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        // Mark as Ready for Pickup, trigger payment UI on patient dashboard
        const apt = await Appointment.findByIdAndUpdate(orderId, {
            status: 'Ready for Pickup',
            verificationCode: '' // Clear any old code
        }, { new: true });

        if (!apt) return res.status(404).json({ success: false, message: "Order not found" });
        console.log(`[PHARMACY] Stage 2: Order ${orderId} is now READY FOR PICKUP.`);

        // Fire-and-forget notification
        const readyNotifTitle = 'Medicines Ready for Pickup';
        const readyNotifMessage = `Your medicines are ready at ${apt.hospitalName || 'the hospital'}! Please proceed to the pharmacy counter.`;
        
        Notification.create({
            patientId: apt.patientId,
            type: 'pharmacy_ready',
            title: readyNotifTitle,
            message: readyNotifMessage
        }).catch(err => console.error('Notification error:', err));

        notificationService.sendNotificationEmail(apt.patientId, 'pharmacy_ready', readyNotifTitle, readyNotifMessage)
            .catch(err => console.error('Email notification error:', err));

        res.json({ success: true, message: "Patient notified. Awaiting payment selection." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAGE 3A: ONLINE PAYMENT (UPI/CARD) ---
exports.confirmPaymentIntent = async (req, res) => {
    try {
        const { orderId, method } = req.body;
        if (!orderId || !method) return res.status(400).json({ success: false, message: "orderId and method required" });

        // Generate 4-digit Collection OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const apt = await Appointment.findByIdAndUpdate(orderId, {
            paymentMethod: method,
            verificationCode: otp,
            isPaid: true // Online payment assumed successful for demo
        }, { new: true });

        if (!apt) return res.status(404).json({ success: false, message: "Order not found" });
        console.log(`[PAYMENT] Stage 3A: Order ${orderId} PAID via ${method}. OTP: ${otp}`);

        // Send OTP via Email
        const otpNotifTitle = 'Medicine Collection OTP';
        const otpNotifMessage = `Your payment of via ${method} was successful. Please show the following OTP at the pharmacy counter to collect your medicines.`;
        
        notificationService.sendNotificationEmail(apt.patientId, 'otp_delivery', otpNotifTitle, otpNotifMessage, { otp })
            .catch(err => console.error('Email OTP notification error:', err));

        res.json({ success: true, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAGE 3B: COD RECEIVED (Pharmacist trigger) ---
exports.verifyPharmacyCOD = async (req, res) => {
    try {
        const { orderId } = req.body;
        // Generate 4-digit Collection OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const apt = await Appointment.findByIdAndUpdate(orderId, {
            paymentMethod: 'COD',
            verificationCode: otp,
            isPaid: true // Mark as paid since pharmacist received cash
        }, { new: true });

        if (!apt) return res.status(404).json({ success: false, message: "Order not found" });
        console.log(`[PAYMENT] Stage 3B: Order ${orderId} COD RECEIVED. OTP: ${otp}`);

        // Send OTP via Email
        const codNotifTitle = 'Medicine Collection OTP (COD)';
        const codNotifMessage = `Cash payment received. Please show the following OTP at the pharmacy counter to collect your medicines.`;
        
        notificationService.sendNotificationEmail(apt.patientId, 'otp_delivery', codNotifTitle, codNotifMessage, { otp })
            .catch(err => console.error('Email OTP notification error:', err));

        res.json({ success: true, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- STAGE 4: FINAL VERIFICATION & ATOMIC STOCK DEDUCTION ---
exports.verifyPharmacyPickup = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { orderId, userInputCode } = req.body;
        const apt = await Appointment.findById(orderId).session(session);

        if (!apt) throw new Error("Appointment not found.");
        if (apt.verificationCode !== userInputCode) throw new Error("Invalid Verification Code.");

        // 1. Mark Order as Collected (Terminal Pharmacy Status)
        apt.status = 'Collected';
        await apt.save({ session });

        // 2. Automated Transaction Ledger & Price Calculation
        let totalAmount = 0;
        if (Array.isArray(apt.medicines)) {
            for (const medName of apt.medicines) {
                const med = await Medicine.findOne({
                    $or: [{ hospitalId: apt.hospitalId }, { hospitalName: apt.hospitalName }],
                    name: new RegExp(`^${medName.trim()}$`, 'i')
                }).session(session);
                if (med) totalAmount += med.price;
            }
        }

        const newTransaction = new Transaction({
            orderId: apt._id,
            patientId: apt.patientId,
            patientName: apt.patientName || "Walk-in Patient",
            hospitalId: apt.hospitalId,
            amount: totalAmount || 500, // Fallback if no prices found
            paymentMethod: apt.paymentMethod
        });
        await newTransaction.save({ session });

        // 3. Automated Inventory Stock Deduction
        if (Array.isArray(apt.medicines)) {
            for (const medName of apt.medicines) {
                const stockUpdate = await Medicine.findOneAndUpdate(
                    {
                        $or: [{ hospitalId: apt.hospitalId }, { hospitalName: apt.hospitalName }],
                        name: new RegExp(`^${medName.trim()}$`, 'i')
                    },
                    { $inc: { qty: -1 } },
                    { session, new: true }
                );
                if (!stockUpdate) {
                    console.warn(`[WARN] Medicine ${medName} not found in stock for deduction.`);
                }
            }
        }

        await session.commitTransaction();
        console.log(`[PHARMACY] Stage 4: Order ${orderId} delivered. Stock deducted. Ledger updated.`);
        res.json({ success: true, message: "Pickup verified and stock deducted." });
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

exports.bulkDeductStock = async (req, res) => {
    try {
        const { medicines, hospitalId } = req.body;
        for (const medName of medicines) {
            await Medicine.findOneAndUpdate(
                {
                    $or: [{ hospitalId }, { hospitalName: hospitalId }],
                    name: new RegExp(`^${medName.trim()}$`, 'i')
                },
                { $inc: { qty: -1 } }
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAmbulanceHistory = async (req, res) => {
    try {
        const history = await Emergency.find({ ambulanceId: req.params.mediId }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- AI SYMPTOM MATCHER ---
exports.aiMatchDoctor = async (req, res) => {
    try {
        console.log("🤖 AI Match Request:", req.body);
        const { symptoms, hospitalId } = req.body;
        if (!symptoms || !hospitalId) {
            return res.status(400).json({ success: false, message: 'Symptoms and hospitalId are required' });
        }

        // Run AI matching
        const matchResult = matchSymptoms(symptoms);

        // Find doctors with matching specialization in this hospital (Resilient)
        const hospitalQuery = [{ hospitalMediId: hospitalId }, { hospitalName: hospitalId }];

        let matchedDoctors = await User.find({
            $or: hospitalQuery,
            role: 'DOCTOR',
            specialization: { $regex: new RegExp(matchResult.matched.specialization, 'i') }
        });

        // FALLBACK: If no specialist found, return General Medicine doctors
        if (matchedDoctors.length === 0) {
            console.log(`⚠️ No ${matchResult.matched.specialization} found. Falling back to General Medicine.`);
            matchedDoctors = await User.find({
                $or: hospitalQuery,
                role: 'DOCTOR',
                specialization: { $regex: /General Medicine/i }
            });
            matchResult.matched.reasoning += " (No specialist available, showing General Physicians)";
        }

        // Also find alternative doctors
        const altDoctors = [];
        for (const alt of matchResult.alternatives) {
            const docs = await User.find({
                $or: hospitalQuery,
                role: 'DOCTOR',
                specialization: { $regex: new RegExp(alt.specialization, 'i') }
            });
            altDoctors.push({ specialization: alt.specialization, description: alt.description, confidence: alt.confidence, doctors: docs });
        }

        console.log(`🤖 AI Match Result: ${matchResult.matched.specialization} (${matchResult.matched.confidence}%) - Found ${matchedDoctors.length} doctors`);

        res.json({
            success: true,
            aiResult: matchResult.matched,
            doctors: matchedDoctors,
            alternatives: altDoctors
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- LIVE QUEUE STATUS ---
exports.getDoctorLiveStatus = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Track the exact token the doctor is currently consulting
        const consulting = await Appointment.findOne({
            doctorId,
            date: { $gte: today, $lt: tomorrow },
            status: 'Consulting'
        });

        // Track the last completed token
        const completed = await Appointment.findOne({
            doctorId,
            date: { $gte: today, $lt: tomorrow },
            status: 'Completed'
        }).sort({ token: -1 });

        // Find the absolute lowest "Waiting" token
        const nextWaiting = await Appointment.findOne({
            doctorId,
            date: { $gte: today, $lt: tomorrow },
            status: 'Waiting'
        }).sort({ token: 1 });

        let currentToken = 1; // Default to 1 if no one has been seen

        if (consulting) {
            currentToken = consulting.token; // Doctor is actively seeing this person
        } else if (completed) {
            // If they just finished someone, the "Serving Now" should realistically be the NEXT person waiting
            currentToken = nextWaiting ? nextWaiting.token : completed.token;
        } else if (nextWaiting) {
            // Doctor hasn't started yet, show who is first in line
            currentToken = nextWaiting.token;
        }

        res.json({ success: true, currentToken });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- PATIENT ACTIVE APPOINTMENT ---
exports.getPatientActiveAppointment = async (req, res) => {
    try {
        const { patientId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const appointment = await Appointment.findOne({
            patientId,
            $or: [
                { date: { $gte: today }, status: { $nin: ['Completed', 'Cancelled', 'Collected'] } },
                { isAdmitted: true },
                { ipdBillStatus: { $in: ['Generated', 'Pending_COD'] } }
            ]
        }).sort({ date: 1, token: 1 });

        if (appointment) {
            res.json({ success: true, appointment });
        } else {
            res.json({ success: false, message: 'No active appointment' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPharmacyTransactions = async (req, res) => {
    try {
        const hospitalId = req.params.hospitalId;
        const transactions = await Transaction.find({ hospitalId })
            .populate('orderId')
            .sort({ timestamp: -1 });

        // Map to format expected by frontend
        const formatted = transactions.map(t => ({
            _id: t._id,
            orderId: t.orderId,
            time: new Date(t.timestamp).toLocaleString(),
            timestamp: t.timestamp,
            patient: t.patientName || (t.orderId ? t.orderId.patientName : "Unknown"),
            items: t.orderId ? (Array.isArray(t.orderId.medicines) ? t.orderId.medicines.join(', ') : t.orderId.medicines) : "N/A",
            method: t.paymentMethod,
            amount: t.amount
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- PATIENT NOTIFICATIONS ---
exports.getPatientNotifications = async (req, res) => {
    try {
        const { patientId } = req.params;
        const notifications = await Notification.find({ patientId })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ patientId, read: false });
        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markNotificationsRead = async (req, res) => {
    try {
        const { patientId } = req.params;
        await Notification.updateMany({ patientId, read: false }, { read: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearAllNotifications = async (req, res) => {
    try {
        const { targetId } = req.params;
        await Notification.deleteMany({
            $or: [
                { patientId: targetId },
                { hospitalId: targetId }
            ]
        });
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.uploadLabReport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
        const filePath = `http://localhost:5000/uploads/${req.file.filename}`;
        res.json({ success: true, url: filePath });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// --- BLOOD DONATION ---
exports.getBloodDonationStatus = async (req, res) => {
    try {
        const { patientId } = req.params;
        const registration = await BloodDonation.findOne({ patientId });
        if (registration) {
            return res.json({ success: true, registered: true, data: registration });
        }
        res.json({ success: true, registered: false });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerBloodDonation = async (req, res) => {
    try {
        const registration = new BloodDonation(req.body);
        await registration.save();
        res.status(201).json({ success: true, message: "Blood donation registration successful", data: registration });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "User already registered for blood donation" });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// Toggle donor stop/resume availability
exports.toggleDonorStatus = async (req, res) => {
    try {
        const { patientId } = req.params;
        const donor = await BloodDonation.findOne({ patientId });
        if (!donor) return res.status(404).json({ success: false, message: 'Donor not found' });
        donor.isActive = !donor.isActive;
        await donor.save();
        res.json({ success: true, isActive: donor.isActive, message: donor.isActive ? 'Donation resumed.' : 'Donation paused.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all active donors, filtering out ignored donors for a specific requester
exports.getAllDonors = async (req, res) => {
    try {
        const { requesterId } = req.query;

        // Only return active donors
        const donors = await BloodDonation.find({ isActive: true }).sort({ registrationDate: -1 });

        if (!requesterId) {
            return res.json({ success: true, donors });
        }

        // Find all donor IDs that have ignored this requester
        const ignoredRequests = await BloodRequest.find({ ignoredBy: requesterId });
        const ignoredDonorIds = new Set(ignoredRequests.map(r => r.donorId));

        // Also hide donors the requester already has a PENDING request to
        const pendingRequests = await BloodRequest.find({ requesterId, status: 'Pending' });
        const pendingDonorIds = new Set(pendingRequests.map(r => r.donorId));

        const filtered = donors.filter(d => !ignoredDonorIds.has(d.patientId) && !pendingDonorIds.has(d.patientId));

        // Fetch real names from User model for transparency
        const enrichedDonors = await Promise.all(filtered.map(async (donor) => {
            const user = await User.findOne({ mediId: donor.patientId }).select('firstName lastName');
            return {
                ...donor.toObject(),
                realName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Anonymous Donor'
            };
        }));

        res.json({ success: true, donors: enrichedDonors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const BloodRequest = require('../models/BloodRequest');

exports.sendBloodRequest = async (req, res) => {
    try {
        const { requesterId, requesterName, hospitalName, donorId, bloodGroup, donationTime } = req.body;

        // Prevent duplicate pending requests to the same donor
        const existing = await BloodRequest.findOne({ requesterId, donorId, status: 'Pending' });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A request is already pending for this donor.' });
        }

        const newRequest = new BloodRequest({ requesterId, requesterName, hospitalName, donorId, bloodGroup, donationTime: donationTime || '' });
        await newRequest.save();

        res.status(201).json({ success: true, message: 'Blood request sent to donor successfully.', request: newRequest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getIncomingBloodRequests = async (req, res) => {
    try {
        const { donorId } = req.params;
        // Return both Pending and Accepted requests for the donor hub
        const requests = await BloodRequest.find({
            donorId,
            status: { $in: ['Pending', 'Accepted'] }
        }).sort({ requestDate: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOutgoingBloodRequests = async (req, res) => {
    try {
        const { requesterId } = req.params;
        const requests = await BloodRequest.find({ requesterId }).sort({ requestDate: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBloodRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Accepted' or 'Ignored'

        const request = await BloodRequest.findById(id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

        const originalStatus = request.status;

        // Only process stock deduction on a NEW acceptance
        if (status === 'Accepted' && originalStatus !== 'Accepted') {

            // Step 1: Find the donor/bank by their mediId
            const donor = await User.findOne({ mediId: request.donorId });

            if (donor && donor.role === 'BLOOD_BANK') {
                // Step 2: Load the stock record for this blood group
                const bloodGroupToDeduct = request.bloodGroup.trim();
                const stockRecord = await BloodStock.findOne({
                    bloodBankId: donor.mediId,
                    bloodGroup: bloodGroupToDeduct
                });

                if (!stockRecord || stockRecord.units <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient ${bloodGroupToDeduct} stock. Please update inventory first.`
                    });
                }

                // Step 3: Deduct 1 unit and save
                stockRecord.units = stockRecord.units - 1;
                stockRecord.lastUpdated = new Date();
                await stockRecord.save();
                console.log(`[STOCK] ${donor.mediId}: ${bloodGroupToDeduct} stock reduced to ${stockRecord.units}`);
            }

            // Step 4: Generate sequential token for today at this hospital
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const lastToken = await BloodRequest.findOne({
                hospitalName: request.hospitalName,
                status: 'Accepted',
                _id: { $ne: request._id },
                requestDate: { $gte: todayStart }
            }).sort({ tokenNumber: -1 });
            request.tokenNumber = (lastToken && lastToken.tokenNumber) ? lastToken.tokenNumber + 1 : 1;

            // Step 5: Notify the patient
            Notification.create({
                patientId: request.requesterId,
                type: 'blood_request_accepted',
                title: '🩸 Blood Request Accepted!',
                message: `Your blood request has been accepted! Token #${request.tokenNumber} at ${request.hospitalName}.${request.donationTime ? ' Time: ' + request.donationTime : ''}`
            }).catch(err => console.error('Notification error:', err));

            // Step 6: Notify the hospital
            const hospital = await User.findOne({ hospitalName: request.hospitalName, role: 'HOSPITAL' });
            if (hospital) {
                Notification.create({
                    patientId: hospital.mediId,
                    type: 'blood_donation_incoming',
                    title: '🩸 Blood Donation Incoming',
                    message: `Token #${request.tokenNumber} — ${request.bloodGroup} blood donation expected from ${request.donorId}.${request.donationTime ? ' Time: ' + request.donationTime : ''}`
                }).catch(err => console.error('Notification error:', err));
            }
        }

        if (status === 'Ignored') {
            if (!request.ignoredBy.includes(request.requesterId)) {
                request.ignoredBy.push(request.requesterId);
            }
        }

        request.status = status;
        await request.save();
        res.json({ success: true, message: `Request ${status} successfully.`, request });
    } catch (err) {
        console.error('[updateBloodRequestStatus ERROR]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Hospital marks blood as received after donation
exports.markBloodReceived = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await BloodRequest.findById(id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

        request.bloodReceived = true;
        request.bloodReceivedAt = new Date();
        await request.save();

        // 1. Notify the requester (Patient)
        Notification.create({
            patientId: request.requesterId,
            type: 'blood_received',
            title: '✅ Blood Ready for Receipt!',
            message: `Your donor (${request.donorId}) has donated the blood! You can now receive it at ${request.hospitalName}.`
        }).catch(err => console.error('Notification error (Patient):', err));

        // 2. Notify the Donor (Thank you message)
        Notification.create({
            patientId: request.donorId,
            type: 'blood_donation_thankyou',
            title: '❤️ Thank You for Your Donation!',
            message: `Thank you for your noble contribution! Your blood donation (Token #${request.tokenNumber}) at ${request.hospitalName} has been successfully received and confirmed. You saved a life today!`
        }).catch(err => console.error('Notification error (Donor):', err));

        res.json({ success: true, message: 'Blood marked as received and participants notified.', request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all accepted blood requests for a specific hospital
exports.getBloodRequestsForHospital = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        // Find by hospitalName (using hospital's mediId to look up name)
        const hospital = await User.findOne({ mediId: hospitalId, role: 'HOSPITAL' });
        const hospitalName = hospital ? hospital.hospitalName : hospitalId;
        const requests = await BloodRequest.find({
            hospitalName,
            status: 'Accepted'
        }).sort({ tokenNumber: 1, requestDate: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- BLOOD BANK ---

exports.getBloodBankInventory = async (req, res) => {
    try {
        const { bloodBankId } = req.params;
        const stocks = await BloodStock.find({ bloodBankId }).sort({ bloodGroup: 1 });
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const result = bloodGroups.map(bg => {
            const found = stocks.find(s => s.bloodGroup === bg);
            return found || { bloodBankId, bloodGroup: bg, units: 0 };
        });
        res.json({ success: true, stocks: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBloodStock = async (req, res) => {
    try {
        const { bloodBankId, bloodGroup, units, operation } = req.body;
        let stock = await BloodStock.findOne({ bloodBankId, bloodGroup });
        if (!stock) {
            stock = new BloodStock({ bloodBankId, bloodGroup, units: 0 });
        }
        if (operation === 'subtract') {
            stock.units = Math.max(0, stock.units - Number(units));
        } else {
            stock.units += Number(units);
        }
        stock.lastUpdated = new Date();
        await stock.save();
        res.json({ success: true, stock });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllBloodBanks = async (req, res) => {
    try {
        const banks = await User.find({ role: 'BLOOD_BANK' }).sort({ createdAt: -1 });
        res.json({ success: true, bloodBanks: banks });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// --- ADMISSION & PRE-BOOKING ---

exports.submitPreBookingRequest = async (req, res) => {
    try {
        const { patientId, doctorId, doctorName, hospitalId, hospitalName, date } = req.body;

        await Notification.create({
            patientId,
            type: 'pre_booking_request',
            title: '📅 Appointment Pre-Booking',
            message: `Dr. ${doctorName} at ${hospitalName} has suggested a follow-up appointment. Would you like to proceed with booking?`,
            metadata: { doctorId, doctorName, hospitalId, hospitalName, date }
        });

        res.json({ success: true, message: 'Pre-booking request sent to patient.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.submitAdmissionRequest = async (req, res) => {
    try {
        const { patientId, patientName, doctorId, doctorName, hospitalId, hospitalName, admissionDate, isUrgent, appointmentId } = req.body;

        // Notify Hospital — include metadata so hospital can allot bed without re-lookup
        await Notification.create({
            hospitalId,
            type: isUrgent ? 'urgent_admission_request' : 'bed_allocation_request',
            title: isUrgent ? '🚨 URGENT ADMISSION REQUEST' : '🛏️ Bed Allocation Request',
            message: `${isUrgent ? 'URGENT: ' : ''}Patient ${patientName} (${patientId}) requires a bed ${admissionDate ? 'on ' + admissionDate : 'immediately'}. Requested by Dr. ${doctorName}.`,
            metadata: { patientId, patientName, appointmentId, admissionDate, doctorName }
        });

        res.json({ success: true, message: 'Admission request sent to hospital.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getHospitalNotifications = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const notifications = await Notification.find({ hospitalId })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ hospitalId, read: false });
        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.allotBed = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { notificationId, bedId, patientId, patientName, appointmentId } = req.body;

        // 1. Find and update the Bed
        const bed = await Bed.findById(bedId).session(session);
        if (!bed || bed.status !== 'Available') throw new Error("Bed is no longer available.");

        bed.status = 'Occupied';
        bed.patientId = patientId;
        bed.patientName = patientName;
        await bed.save({ session });

        // 2. Find and update the Appointment (or current active session)
        // We look for an active appointment for this patient at this hospital
        const apt = await Appointment.findById(appointmentId).session(session);
        if (apt) {
            apt.isAdmitted = true;
            apt.assignedBed = bed.bedNumber;
            apt.assignedWard = bed.ward;
            await apt.save({ session });
        }

        // 3. Mark the request notification as read
        if (notificationId) {
            await Notification.findByIdAndUpdate(notificationId, { read: true }).session(session);
        }

        // 4. Notify the Patient
        await Notification.create([{
            patientId,
            type: 'bed_allocated',
            title: '🏥 Bed Allocated',
            message: `You have been allotted Bed ${bed.bedNumber} in ${bed.ward} Ward at ${apt?.hospitalName || 'hospital'}. Admission Date: ${apt?.admissionDate || 'N/A'}.`
        }], { session });

        await session.commitTransaction();
        res.json({ success: true, message: "Bed successfully alloted and patient notified." });
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

exports.getDoctorIPDPatients = async (req, res) => {
    try {
        const { doctorId } = req.params;
        // Fetch appointments where the patient is admitted and assigned to this doctor
        const admitted = await Appointment.find({
            doctorId,
            isAdmitted: true
        }).sort({ admissionDate: -1 });

        res.json({ success: true, patients: admitted });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- IPD DISCHARGE & BILLING FLOW ---

exports.requestDischarge = async (req, res) => {
    try {
        const apt = await Appointment.findById(req.params.id);
        if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
        if (!apt.isAdmitted) return res.status(400).json({ success: false, message: 'Patient is not admitted' });

        apt.dischargeRequested = true;
        await apt.save();

        res.json({ success: true, message: 'Discharge requested successfully', appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.generateIPDBill = async (req, res) => {
    try {
        const { id } = req.params;
        const { totalAmount } = req.body;

        const apt = await Appointment.findById(id);
        if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
        if (!apt.dischargeRequested) return res.status(400).json({ success: false, message: 'Discharge not yet requested by doctor' });
        if (apt.ipdBillStatus !== 'None') return res.status(400).json({ success: false, message: `Bill already ${apt.ipdBillStatus}` });

        apt.ipdBillAmount = Number(totalAmount);
        apt.ipdBillStatus = 'Generated';
        apt.dischargeDate = new Date();
        await apt.save();

        // Notify patient about the bill
        await Notification.create({
            patientId: apt.patientId,
            message: `Your IPD discharge bill of ₹${totalAmount} has been generated. Please proceed to payment.`,
            type: 'INFO',
            read: false,
            createdAt: new Date()
        });

        res.json({ success: true, message: 'Bill generated successfully', appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.payIPDBill = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body; // 'Online' or 'COD'

        const apt = await Appointment.findById(id);
        if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });

        if (paymentMethod === 'Online') {
            apt.ipdBillStatus = 'Paid';
            apt.status = 'Completed'; // Fully complete the cycle
            
            // Free the bed
            if (apt.isAdmitted && apt.assignedBed) {
                const bed = await Bed.findOne({
                    hospitalMediId: apt.hospitalId,
                    bedNumber: apt.assignedBed,
                    ward: apt.assignedWard
                });
                if (bed) {
                    bed.status = 'Available';
                    bed.patientId = null;
                    bed.patientName = null;
                    await bed.save();
                }
                apt.isAdmitted = false;
            }
        } else if (paymentMethod === 'COD') {
            apt.ipdBillStatus = 'Pending_COD';
            // Bed remains occupied until hospital confirms
        } else {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }

        apt.paymentMethod = paymentMethod;
        await apt.save();

        res.json({ success: true, message: `Payment initiated via ${paymentMethod}`, appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.confirmCODPayment = async (req, res) => {
    try {
        const { id } = req.params;

        const apt = await Appointment.findById(id);
        if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
        if (apt.ipdBillStatus !== 'Pending_COD') return res.status(400).json({ success: false, message: 'No pending COD payment found' });

        apt.ipdBillStatus = 'Paid';
        apt.status = 'Completed'; // Fully complete the cycle

        // Free the bed
        if (apt.isAdmitted && apt.assignedBed) {
            const bed = await Bed.findOne({
                hospitalMediId: apt.hospitalId,
                bedNumber: apt.assignedBed,
                ward: apt.assignedWard
            });
            if (bed) {
                bed.status = 'Available';
                bed.patientId = null;
                bed.patientName = null;
                await bed.save();
            }
            apt.isAdmitted = false;
        }

        await apt.save();

        // Notify patient
        Notification.create({
            patientId: apt.patientId,
            message: `Your COD payment for IPD discharge has been confirmed. Thank you!`,
            type: 'SUCCESS',
            read: false,
            createdAt: new Date()
        });

        res.json({ success: true, message: 'COD Payment confirmed, bed freed.', appointment: apt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
