const axios = require('axios');
async function test() {
    try {
        const res = await axios.put('http://localhost:5000/api/hospital/update-capacity', {
            hospitalMediId: 'MS-HOSP-6356',
            general: 20,
            icu: 15,
            maternity: 6
        });
        console.log('Success:', res.data);
    } catch (err) {
        console.log('Error Status:', err.response?.status);
        console.log('Error Data:', err.response?.data);
        console.log('Error Message:', err.message);
    }
}
test();
