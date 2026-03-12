const axios = require('axios');

async function testSOS() {
    try {
        console.log("--- 1. Triggering SOS ---");
        const triggerRes = await axios.post('http://localhost:5000/api/emergency/trigger-sos', {
            requesterId: "TEST-USER",
            requesterName: "Test Patient",
            lat: 10.0,
            lng: 10.0,
            emergencyType: "Cardiac"
        });
        const emergencyId = triggerRes.data.emergency._id;
        console.log("SOS Triggered. ID:", emergencyId);

        console.log("\n--- 2. Checking Status (Searching) ---");
        const statusRes1 = await axios.get(`http://localhost:5000/api/emergency/status/${emergencyId}`);
        console.log("Status:", statusRes1.data.status);

        console.log("\n--- 3. Accepting SOS (Ambulance) ---");
        const acceptRes = await axios.put(`http://localhost:5000/api/emergency/accept/${emergencyId}`, {
            ambulanceId: "AMB-001",
            driverName: "John Doe",
            driverPhone: "555-0199",
            lat: 10.1,
            lng: 10.1
        });
        console.log("Accept Response Success:", acceptRes.data.success);

        console.log("\n--- 4. Checking Status (Accepted) ---");
        const statusRes2 = await axios.get(`http://localhost:5000/api/emergency/status/${emergencyId}`);
        console.log("Status:", statusRes2.data.status);
        console.log("Ambulance Name:", statusRes2.data.emergency.driverName);

        console.log("\n--- 5. Updating Location ---");
        await axios.put(`http://localhost:5000/api/emergency/update-location/${emergencyId}`, {
            lat: 10.2,
            lng: 10.2
        });
        const statusRes3 = await axios.get(`http://localhost:5000/api/emergency/status/${emergencyId}`);
        console.log("New Lat:", statusRes3.data.emergency.ambulanceLocation.lat);

        console.log("\n--- 6. Completing SOS ---");
        const completeRes = await axios.put(`http://localhost:5000/api/emergency/complete/${emergencyId}`);
        console.log("Complete Response Success:", completeRes.data.success);

        console.log("\n--- 7. Final Status Check ---");
        const statusRes4 = await axios.get(`http://localhost:5000/api/emergency/status/${emergencyId}`);
        console.log("Final Status:", statusRes4.data.status);

        console.log("\n✅ ALL BACKEND STEPS PASSED!");
    } catch (err) {
        console.error("❌ TEST FAILED:", err.response ? err.response.data : err.message);
    }
}

testSOS();
