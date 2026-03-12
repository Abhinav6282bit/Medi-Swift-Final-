require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { matchSymptoms } = require('./utils/symptomMatcher');

const MONGO_URI = process.env.MONGO_URI;

async function testAI() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const hospital = await User.findOne({ role: 'HOSPITAL' });
        if (!hospital) {
            console.log('❌ No hospital found.');
            process.exit(1);
        }
        console.log(`🏥 Testing with Hospital: ${hospital.hospitalName} (${hospital.mediId})`);
        
        // Test Case 1: Chest Pain (Cardiology)
        const symptoms = "I have severe chest pain and palpitations";
        console.log(`\n🔍 Testing Symptoms: "${symptoms}"`);

        const matchResult = matchSymptoms(symptoms);
        console.log(`🤖 AI Match: ${matchResult.matched.specialization} (Confidence: ${matchResult.matched.confidence}%)`);

        // Check DB Query
        console.log(`🔎 Searching for doctors with specialization: ${matchResult.matched.specialization} in ${hospital.mediId}`);
        
        const doctors = await User.find({
            hospitalMediId: hospital.mediId,
            role: 'DOCTOR',
            specialization: { $regex: new RegExp(matchResult.matched.specialization, 'i') }
        });

        console.log(`👨‍⚕️ Found ${doctors.length} doctors:`);
        doctors.forEach(d => console.log(` - ${d.firstName} ${d.lastName} (${d.specialization}) | ID: ${d.mediId}`));

        if (doctors.length === 0) {
            console.log("⚠️ No doctors found! Checking raw doctor data...");
            const allDocs = await User.find({ role: 'DOCTOR', hospitalMediId: hospital.mediId });
            console.log("ALL DOCTORS IN DB for this hospital:", allDocs.map(d => `${d.firstName} (${d.specialization})`).join(', '));
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

testAI();
