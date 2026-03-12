const axios = require('axios');

async function testRoutes() {
    console.log("🔍 Checking Backend Server Health...");

    const baseUrl = 'http://localhost:5000';

    try {
        // 1. Check Root
        const root = await axios.get(`${baseUrl}/`);
        console.log(`✅ Root Check: ${root.status} OK - "${root.data}"`);
    } catch (err) {
        console.log(`❌ Root Check Failed: ${err.message}`);
    }

    try {
        // 2. Check AI Endpoint
        console.log("🔍 Testing /api/ai-match-doctor...");
        const ai = await axios.post(`${baseUrl}/api/ai-match-doctor`, {
            symptoms: "test", 
            hospitalId: "test"
        });
        console.log(`✅ AI Endpoint Found: ${ai.status} OK`);
        console.log("Response:", ai.data);
    } catch (err) {
        if (err.response) {
            console.log(`❌ AI Endpoint Error: ${err.response.status} ${err.response.statusText}`);
            console.log("Response Data:", err.response.data);
        } else {
            console.log(`❌ Network Error: ${err.message}`);
        }
    }
}

testRoutes();
