require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.set('debug', true);
mongoose.set('bufferCommands', false);

// 3. Configuration Validation
if (!process.env.MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI not defined in .env');
    process.exit(1);
}

// 4. Mongoose Connection with Options
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            tls: true,
            tlsInsecure: true,
        });
        console.log("------------------------------------");
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log("------------------------------------");
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        // Optional: Only exit if you want to stop the server on DB fail
        // process.exit(1);
    }
};

// 5. Connection Event Handlers
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// 6. Initialize Connection
connectDB();

// --- 👤 USER SCHEMA (Updated with Email & HospitalName) ---
const userSchema = new mongoose.Schema({
    role: { type: String, required: true },
    mediId: { type: String, unique: true },
    password: { type: String },
    securityKey: { type: String, default: 'swift-admin-2026' },
    hospitalName: String,
    labName: String,
    pharmacyName: String,
    driverName: String,
    firstName: String,
    lastName: String,
    phone: String,
    email: String,
    licenseNo: String,
    address: String,
    specialization: String,
    totalBeds: Number,
    icuBeds: Number,
    status: { type: String, default: 'active' },
    isOnline: { type: Boolean, default: false },
    currentLocation: { lat: Number, lng: Number }
});

const User = mongoose.model('User', userSchema);

// --- 📋 RECORD SCHEMA (Updated to hold Email/MediId for Personnel lists) ---
const recordSchema = new mongoose.Schema({
    vault: { type: String, required: true },
    name: String,
    detail: String,
    contact: String,
    email: String,
    mediId: String,
    category: { type: String },
    count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', recordSchema);

// --- 📅 APPOINTMENT SCHEMA ---
const appointmentSchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    date: { type: String, required: true },
    patientName: String,
    patientMediId: String,
    doctorId: String,
    doctorName: String,
    speciality: String,
    token: String,
    status: { type: String, default: 'Waiting' },
    createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// --- 📄 CLINICAL RECORD SCHEMA (Updated) ---
const clinicalRecordSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    patientMediId: String,
    patientName: String,
    hospitalId: String,
    doctorName: String,
    diagnosis: String,
    medicines: String,
    labTests: String,
    labResultSummary: { type: String, default: "Awaiting Results" },
    labStatus: { type: String, default: "Pending" },
    pharmacyStatus: { type: String, default: "Pending" },
    verificationCode: { type: String, default: "" },
    paymentMethod: { type: String, enum: ['COD', 'Online', ''], default: "" },
    paymentStatus: { type: String, default: "Unpaid" },
    collectedAt: { type: Date },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    createdAt: { type: Date, default: Date.now }
});
const ClinicalRecord = mongoose.model('ClinicalRecord', clinicalRecordSchema);

// --- 💊 PRESCRIPTION SCHEMA ---
const prescriptionSchema = new mongoose.Schema({
    patientMediId: String,
    patientName: String,
    hospitalId: String,
    doctorName: String,
    medicines: [String],
    status: {
        type: String,
        enum: ['Pending', 'StockChecked', 'Ready for Pickup', 'Completed'],
        default: 'Pending'
    },
    orderId12: String,
    verificationCode: String,
    paymentMethod: { type: String, enum: ['COD', 'Online'], default: 'COD' },
    isPaid: { type: Boolean, default: false },
    expiryTime: Date,
    createdAt: { type: Date, default: Date.now }
});
const Prescription = mongoose.model('Prescription', prescriptionSchema);

const stockSchema = new mongoose.Schema({
    hospitalId: String,
    name: { type: String, required: true },
    qty: { type: Number, default: 0 },
    minQty: { type: Number, default: 5 },
    price: { type: Number, default: 0 },
    category: String
});
const Stock = mongoose.model('Stock', stockSchema);

const labOrderSchema = new mongoose.Schema({
    patientMediId: String,
    patientName: String,
    hospitalId: String,
    doctorName: String,
    testNames: String,
    status: {
        type: String,
        enum: ['Requested', 'Sample Collected', 'Processing', 'Completed'],
        default: 'Requested'
    },
    results: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});
const LabOrder = mongoose.model('LabOrder', labOrderSchema);

// --- 💰 TRANSACTION SCHEMA (For Permanent Reports) ---
const transactionSchema = new mongoose.Schema({
    hospitalId: String,
    patientName: String,
    amount: Number,
    method: String,
    items: String,
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// --- 🚑 AMBULANCE EMERGENCY SCHEMA ---
const emergencySchema = new mongoose.Schema({
    requesterId: String,
    requesterName: String,
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    ambulanceId: { type: String, default: null },
    driverPhone: { type: String, default: "" },
    ambulanceLocation: { lat: Number, lng: Number },
    status: {
        type: String,
        enum: ['Searching', 'Accepted', 'OnWay', 'Arrived', 'Completed'],
        default: 'Searching'
    },
    createdAt: { type: Date, default: Date.now }
});
const Emergency = mongoose.model('Emergency', emergencySchema);

// --- 🧪 LAB DASHBOARD ROUTES ---

// 1. Get lab tasks for a specific hospital
app.get('/api/get-hospital-labs/:hospitalId', async (req, res) => {
    try {
        const hId = decodeURIComponent(req.params.hospitalId);

        const list = await LabOrder.find({
            hospitalId: hId
        }).sort({ createdAt: -1 });

        res.json(list);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Update status (When tech finishes the test)
app.put('/api/update-lab-status', async (req, res) => {
    const { orderId, status, results } = req.body;
    try {
        // 1. Update the Lab Order
        const updatedOrder = await LabOrder.findByIdAndUpdate(
            orderId,
            { status, results },
            { new: true }
        );

        // 2. 🚀 NEW: Update the ClinicalRecord so the Patient can see the result
        if (status === 'Completed' && updatedOrder) {
            await ClinicalRecord.findOneAndUpdate(
                {
                    patientMediId: updatedOrder.patientMediId,
                    labTests: new RegExp(updatedOrder.testNames, 'i')
                },
                {
                    labResultSummary: results,
                    labStatus: 'Completed'
                },
                { sort: { createdAt: -1 } }
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Lab update error:", err);
        res.status(500).send("Update failed");
    }
});

// --- 🛠️ HELPERS ---
const generateMediId = (role) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = role.substring(0, 4).toUpperCase();
    return `MS-${prefix}-${randomNum}`;
};

const generatePickupCode = () => Math.floor(100000 + Math.random() * 900000).toString();


// 🆕 PHARMACY & PRESCRIPTION ROUTES

app.get('/api/get-patient-prescriptions/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const prescriptions = await Prescription.find({
            $or: [
                { patientMediId: patientId },
                { patientMediId: "N/A" }
            ],
            status: { $ne: 'Completed' }
        }).sort({ createdAt: -1 });
        res.json(prescriptions);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get prescriptions for a specific hospital (Pharmacy View)
app.get('/api/pharmacy/prescriptions/:hId', async (req, res) => {
    try {
        const hId = decodeURIComponent(req.params.hId).trim();
        const list = await Prescription.find({
            hospitalId: hId,
            status: { $ne: 'Completed' }
        }).sort({ createdAt: -1 });
        res.json(list);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark as "Ready" and Generate Verification Code
app.put('/api/pharmacy/prepare-order', async (req, res) => {
    try {
        const { orderId } = req.body;
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Update the Prescription
        const updatedPrescription = await Prescription.findByIdAndUpdate(
            orderId,
            { status: 'Ready for Pickup', verificationCode: code },
            { new: true }
        );

        if (!updatedPrescription) return res.status(404).json({ success: false });

        // 2. 🚀 SYNC TO CLINICAL RECORD: This makes it visible to the patient
        await ClinicalRecord.findOneAndUpdate(
            {
                patientMediId: updatedPrescription.patientMediId,
                pharmacyStatus: 'Pending'
            },
            {
                pharmacyStatus: 'Ready for Pickup',
                verificationCode: code
            },
            { sort: { createdAt: -1 } }
        );

        res.json({ success: true, code: code });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Final Verification (Patient gives code to Pharmacist)
app.post('/api/pharmacy/verify-pickup', async (req, res) => {
    try {
        const { orderId, userInputCode, paymentMethod, amount, items } = req.body;
        const order = await Prescription.findById(orderId);

        if (order && order.verificationCode === userInputCode) {
            // 1. Update Prescription Status
            order.status = 'Completed';
            order.paymentMethod = paymentMethod;
            order.isPaid = true;
            await order.save();

            // 🚀 ADD-ON: INVENTORY DEDUCTION LOGIC
            if (order.medicines && order.medicines.length > 0) {
                for (const medName of order.medicines) {
                    await mongoose.model('Stock').findOneAndUpdate(
                        {
                            hospitalId: { $regex: new RegExp(`^${order.hospitalId}$`, 'i') },
                            name: { $regex: new RegExp(`^${medName.trim()}$`, 'i') }
                        },
                        { $inc: { qty: -1 } }
                    );
                }
            }

            // ✅ PERMANENT REPORTING: Save to Transactions Collection (Your Original Logic)
            await new Transaction({
                hospitalId: order.hospitalId,
                patientName: order.patientName,
                amount: amount,
                method: paymentMethod,
                items: items
            }).save();

            // Sync to Clinical Record (Your Original Logic)
            await ClinicalRecord.findOneAndUpdate(
                { patientMediId: order.patientMediId, verificationCode: userInputCode },
                { pharmacyStatus: 'Completed', paymentStatus: 'Paid', collectedAt: new Date() },
                { sort: { createdAt: -1 } }
            );

            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: "❌ Invalid Verification Code" });
        }
    } catch (err) {
        console.error("Verify Pickup Error:", err);
        res.status(500).json({ success: false });
    }
});

// Get stock for a specific hospital
app.get('/api/pharmacy/stock/:hId', async (req, res) => {
    try {
        const hId = decodeURIComponent(req.params.hId).trim();
        const stock = await Stock.find({ hospitalId: { $regex: new RegExp(`^${hId}$`, 'i') } });
        res.json(stock);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Optimized Add or Restock Route
app.post('/api/pharmacy/add-stock', async (req, res) => {
    try {
        const { hospitalId, name, qty, price, category, minQty } = req.body;


        const stockItem = await Stock.findOneAndUpdate(
            {
                hospitalId: hospitalId,
                name: new RegExp(`^${name.trim()}$`, 'i')
            },
            {
                $inc: { qty: Number(qty) },
                $set: {
                    price: Number(price),
                    category: category,
                    minQty: minQty || 5
                }
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Stock updated successfully", item: stockItem });
    } catch (err) {
        console.error("Add Stock Error:", err);
        res.status(500).json({ success: false, message: "Failed to add stock" });
    }
});

app.put('/api/pharmacy/update-stock', async (req, res) => {
    try {
        const { orderId, availableMedicines, unavailableMedicines } = req.body;

        const updatedPrescription = await Prescription.findByIdAndUpdate(
            orderId,
            {
                medicines: availableMedicines,
                status: 'StockChecked',

            },
            { new: true }
        );

        res.json({ success: true, message: "Stock status updated" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});
// --- 🛠️ APPOINTMENT STATUS & CONSULTATION ROUTES ---

// 1. Get Patient History (NEW: Add this before complete-session)
app.get('/api/patient-history/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { name } = req.query;

        if (!patientId || patientId === "undefined" || patientId === "null") {
            return res.json([]);
        }

        // Search by ID
        let history = await ClinicalRecord.find({ patientMediId: patientId }).sort({ createdAt: -1 });

        if (history.length === 0 && name) {
            history = await ClinicalRecord.find({
                patientName: new RegExp(name, 'i'),
                patientMediId: "N/A"
            }).sort({ createdAt: -1 });
        }

        console.log(`[API] History for: ${patientId} | Records: ${history.length}`);
        res.json(history);
    } catch (err) {
        console.error("❌ History error:", err.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});



// Update Appointment Status (Used for Treat & Skip)
app.put('/api/update-appointment-status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedApt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );
        if (!updatedApt) return res.status(404).json({ success: false, message: "Appointment not found" });
        res.json({ success: true, appointment: updatedApt });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



app.get('/api/patient/active-prescription/:patientId', async (req, res) => {
    try {
        const order = await Prescription.findOne({
            patientMediId: req.params.patientId,
            status: 'Ready for Pickup'
        }).sort({ createdAt: -1 });
        res.json(order);
    } catch (err) {
        res.status(500).json({ success: false });
    }
});
app.put('/api/patient/confirm-payment-intent', async (req, res) => {
    try {
        const { orderId, method } = req.body;

        // 1. Update Prescription
        const isPaid = method === 'Online';
        const prescription = await Prescription.findByIdAndUpdate(
            orderId,
            { paymentMethod: method, isPaid: isPaid },
            { new: true }
        );

        // 2. Sync to ClinicalRecord so the patient's UI updates the "Status"
        await ClinicalRecord.findOneAndUpdate(
            { patientMediId: prescription.patientMediId, pharmacyStatus: 'Ready for Pickup' },
            {
                paymentMethod: method,
                paymentStatus: isPaid ? 'Paid' : 'Unpaid'
            },
            { sort: { createdAt: -1 } }
        );

        res.json({ success: true, message: "Payment method confirmed. Show pickup code." });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// --- FIX FOR COMPLETE SESSION ROUTE ---
app.post('/api/complete-session', async (req, res) => {
    try {
        const { appointmentId, diagnosis, medicines, labTests } = req.body;
        const apt = await Appointment.findById(appointmentId);

        if (!apt) return res.status(404).json({ success: false, message: "Appointment not found" });
        const hospitalId = apt.hospitalName || "City General Hospital";
        const pMediId = apt.patientMediId || apt.patientId || "N/A";


        // 1. Clinical Record (Patient History)
        const newRecord = new ClinicalRecord({
            appointmentId: apt._id,
            patientMediId: pMediId,
            patientName: apt.patientName,
            hospitalId: hospitalId,
            doctorName: apt.doctorName,
            diagnosis,
            medicines,
            labTests
        });
        await newRecord.save();

        // 2. Pharmacy Prescription (Only if medicines exist)
        if (medicines && medicines.trim() !== "") {
            await new Prescription({
                patientMediId: pMediId,
                patientName: apt.patientName,
                hospitalId: hospitalId,
                doctorName: apt.doctorName,
                medicines: medicines.split(',').map(m => m.trim()),
                status: 'Pending',
                orderId12: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
            }).save();
        }
        apt.status = 'Completed';
        await apt.save();

        // 3. Lab Order (Only if tests exist)
        if (labTests && labTests.trim() !== "") {
            await new LabOrder({
                patientMediId: pMediId,
                patientName: apt.patientName,
                hospitalId: hospitalId,
                doctorName: apt.doctorName,
                testNames: labTests,
                status: 'Requested'
            }).save();
        }

        apt.status = 'Completed';
        await apt.save();

        res.json({ success: true, message: "Records synced successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 🛠️ APPOINTMENT API ROUTES ---

// 1. Search Global Patient (Used for the "YES" logic in pop-up)
app.get('/api/search-patient/:mediId', async (req, res) => {
    try {

        const patient = await User.findOne({ mediId: req.params.mediId, role: 'PATIENT' });
        if (patient) {
            res.json({ success: true, patient });
        } else {
            res.status(404).json({ success: false, message: "Patient not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Book Appointment (Sequential + Daily Reset Logic)
app.post('/api/book-appointment', async (req, res) => {
    try {
        const { hospitalId, doctorId, date } = req.body;
        const lastApt = await Appointment.findOne({ hospitalId, doctorId, date })
            .sort({ token: -1 });

        const nextToken = lastApt ? parseInt(lastApt.token) + 1 : 1;

        const newAppointment = new Appointment({
            ...req.body,
            doctorId: req.body.doctorId ? req.body.doctorId.toUpperCase() : "",
            token: nextToken.toString()
        });

        await newAppointment.save();
        res.json({
            success: true,
            message: "Appointment Booked Successfully",
            appointment: newAppointment
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// REPLACE your current app.get('/api/get-hospital-appointments/:hospitalId')
app.get('/api/get-hospital-appointments/:hospitalId', async (req, res) => {
    try {
        const hId = decodeURIComponent(req.params.hospitalId).trim();

        let query = {};
        if (hId !== 'all') {
            const escapedId = hId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            query = {
                $or: [
                    { hospitalId: { $regex: new RegExp(`^${escapedId}$`, 'i') } },
                    { hospitalName: { $regex: new RegExp(`^${escapedId}$`, 'i') } }
                ]
            };
        }

        const appointments = await Appointment.find({ hospitalId: req.params.hospitalId })
            .sort({ token: 1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});



// --- 🛠️ ADMIN API ROUTES ---

app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = {
            hospitals: await User.countDocuments({ role: 'HOSPITAL' }),
            labs: await User.countDocuments({ role: 'LAB' }),
            ambulances: await User.countDocuments({ role: 'AMB' }),
            pharmacies: await User.countDocuments({ role: 'PHA' }),
            patients: await User.countDocuments({ role: 'PATIENT' }),
            doctors: await User.countDocuments({ role: 'DOCTOR' }),
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/view-all/:role', async (req, res) => {
    try {
        const data = await User.find({ role: req.params.role });
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


app.post('/api/admin/add-hospital', async (req, res) => {
    try {
        const userRole = req.body.role || 'USER';
        const autoGeneratedId = generateMediId(userRole);
        const userData = new User({
            ...req.body,
            mediId: autoGeneratedId,
            role: userRole
        });
        await userData.save();
        res.json({
            success: true,
            message: `${userRole} Registered Successfully`,
            generatedId: autoGeneratedId
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/delete-entity/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 🔑 LOGIN ROUTE (Updated for smooth dashboard transitions) ---
app.post('/api/login', async (req, res) => {
    try {
        const { mediId, password } = req.body;
        const user = await User.findOne({ mediId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Medi-ID not found" });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        res.json({
            success: true,
            role: user.role,
            firstName: user.firstName,
            hospitalId: user.hospitalName,
            hospitalName: user.hospitalName,
            mediId: user.mediId,
            userData: user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 📋 RECORD MANAGEMENT ROUTES (Updated) ---

app.get('/api/get-records', async (req, res) => {
    try {
        const { vault } = req.query;
        const records = await Record.find({ vault });
        res.json(records);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/add-record', async (req, res) => {
    try {
        const { vault } = req.query;
        const newRecord = new Record({ ...req.body, vault });
        await newRecord.save();
        res.json({ success: true, message: "Entry added to vault" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/delete-record', async (req, res) => {
    try {
        const { id } = req.query;
        await Record.findByIdAndDelete(id);
        res.json({ success: true, message: "Entry removed" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 🆕 PATIENT SELF-BOOKING HELPER ROUTES ---

// 1. Get all hospitals for the patient dropdown
app.get('/api/get-all-hospitals', async (req, res) => {
    try {
        const hospitals = await User.find({ role: 'HOSPITAL' }, 'mediId hospitalName');
        res.json(hospitals);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 🚑 AMBULANCE & EMERGENCY LOGIC ROUTES ---

// 1. Toggle Duty Status (Online/Offline)
app.put('/api/ambulance/toggle-status/:mediId', async (req, res) => {
    try {
        const { isOnline, lat, lng } = req.body;
        await User.findOneAndUpdate(
            { mediId: req.params.mediId },
            { isOnline, currentLocation: isOnline ? { lat, lng } : null }
        );
        res.json({ success: true, isOnline });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Poll for Emergencies (The "Handshake")
app.get('/api/ambulance/check-emergency/:mediId', async (req, res) => {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const emergency = await Emergency.findOne({
            $or: [
                {
                    status: 'Searching',
                    createdAt: { $gte: twoMinutesAgo }
                },
                {
                    ambulanceId: req.params.mediId,
                    status: 'Accepted'
                }
            ]
        }).sort({ createdAt: -1 });

        res.json({ emergency: emergency || null });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 3. Trigger Emergency SOS (Patient Side)
app.post('/api/emergency/trigger-sos', async (req, res) => {
    try {
        const { requesterId, requesterName, lat, lng, address } = req.body;

        const newEmergency = new Emergency({
            requesterId: requesterId || `GUEST-${Date.now()}`,
            requesterName: requesterName || "Emergency Guest",
            location: { lat, lng, address: address || "Global SOS Request" },
            ambulanceId: null,
            status: 'Searching'
        });

        await newEmergency.save();
        res.json({ success: true, emergency: newEmergency });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. Accept Emergency (Driver Side)
app.put('/api/emergency/accept/:id', async (req, res) => {
    try {
        const { ambulanceId, driverPhone, lat, lng } = req.body;
        const updated = await Emergency.findByIdAndUpdate(
            req.params.id,
            {
                status: 'Accepted',
                ambulanceId: ambulanceId,
                driverPhone: driverPhone,
                ambulanceLocation: { lat, lng }
            },
            { new: true }
        );
        res.json({ success: true, emergency: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. Live GPS Broadcast (Driver Side while moving)
app.put('/api/emergency/update-location/:id', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        await Emergency.findByIdAndUpdate(req.params.id, {
            ambulanceLocation: { lat, lng }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Get Live Status (Patient Side tracking)
app.get('/api/emergency/status/:id', async (req, res) => {
    try {
        const emergency = await Emergency.findById(req.params.id);
        if (!emergency) return res.status(404).json({ success: false });
        res.json({
            success: true,
            status: emergency.status,
            emergency: emergency
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 7. Complete Mission
app.put('/api/emergency/complete/:id', async (req, res) => {
    try {
        await Emergency.findByIdAndUpdate(req.params.id, { status: 'Completed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});