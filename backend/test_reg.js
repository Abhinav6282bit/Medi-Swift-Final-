const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testRegistration() {
    console.log("--- STARTING REGISTRATION TESTS ---");

    // 1. Test Patient Registration
    try {
        console.log("\n[TEST] Registering Patient...");
        const patientData = new FormData();
        patientData.append('role', 'PATIENT');
        patientData.append('firstName', 'Test');
        patientData.append('lastName', 'Patient');
        patientData.append('email', `test_patient_${Date.now()}@example.com`);
        patientData.append('phone', '9876543210');
        patientData.append('address', '123 Test Street');
        patientData.append('aadharNumber', '1234' + Date.now().toString().slice(-8));
        patientData.append('password', 'password123');
        patientData.append('dob', '1990-01-01');
        patientData.append('gender', 'Male');

        // Use a small dummy file for photo
        const dummyFilePath = path.join(__dirname, 'dummy.txt');
        fs.writeFileSync(dummyFilePath, 'dummy image content');
        patientData.append('photo', fs.createReadStream(dummyFilePath));

        const res = await axios.post('http://localhost:5000/api/register-user', patientData, {
            headers: patientData.getHeaders()
        });

        console.log("✅ PATIENT REGISTRATION SUCCESS:");
        console.log(res.data);
    } catch (err) {
        console.error("❌ PATIENT REGISTRATION FAILED:");
        console.error(err.response?.data || err.message);
    }

    // 2. Test Ambulance Registration
    try {
        console.log("\n[TEST] Registering Ambulance...");
        const ambData = new FormData();
        ambData.append('role', 'AMB');
        ambData.append('driverName', 'Ambulance Driver');
        ambData.append('email', `test_amb_${Date.now()}@example.com`);
        ambData.append('vehicleNo', 'UP32-AB-1234');
        ambData.append('licenseNo', 'DL-TEST-999');
        ambData.append('phone', '1234567890');
        ambData.append('address', 'Ambulance Station 1');
        ambData.append('aadharNumber', '9876' + Date.now().toString().slice(-8));
        ambData.append('password', 'ambpass123');

        const dummyFilePath = path.join(__dirname, 'dummy.txt');
        ambData.append('photo', fs.createReadStream(dummyFilePath));

        const res = await axios.post('http://localhost:5000/api/register-user', ambData, {
            headers: ambData.getHeaders()
        });

        console.log("✅ AMBULANCE REGISTRATION SUCCESS:");
        console.log(res.data);
    } catch (err) {
        console.error("❌ AMBULANCE REGISTRATION FAILED:");
        console.error(err.response?.data || err.message);
    }

    console.log("\n--- REGISTRATION TESTS COMPLETE ---");
}

testRegistration();
