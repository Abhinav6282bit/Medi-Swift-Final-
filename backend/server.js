require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express.static('uploads'));

// Routes
console.log("🛠️ Registering Manual Routes (v2 with Persistence & Queue)...");
const systemController = require('./controllers/systemController');
app.post('/api/ai-match-doctor', systemController.aiMatchDoctor);
app.get('/api/doctor-live-status/:doctorId', systemController.getDoctorLiveStatus);
app.get('/api/patient-active-appointment/:patientId', systemController.getPatientActiveAppointment);

app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api', require('./routes/authRoutes'));
app.use('/api/hospital', require('./routes/hospitalRoutes'));
console.log("✅ Hospital Routes Registered: /api/hospital/*");

app.get('/', (req, res) => {
    res.send('Medi-Swift Modular Backend Ready');
});

const startServer = async () => {
    try {
        // Connect to Database
        await connectDB();

        const PORT = 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
};

startServer();