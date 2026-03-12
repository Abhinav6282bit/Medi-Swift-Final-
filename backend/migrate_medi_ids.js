require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Bed = require('./models/Bed');
const BloodDonation = require('./models/BloodDonation');
const BloodRequest = require('./models/BloodRequest');
const Record = require('./models/Record');
const Notification = require('./models/Notification');
const Transaction = require('./models/Transaction');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medi-swift';

const prefixMap = {
    // Pharmacy
    'MS-PHA-': 'MS-PHAR-',
    'MS-PHARM-': 'MS-PHAR-',
    'MS-PHARMACY-': 'MS-PHAR-',
    // Ambulance
    'MS-AMB-': 'MS-AMBU-',
    'MS-AMBULANCE-': 'MS-AMBU-',
    // Patient
    'MS-PAT-': 'MS-PATI-',
    'MS-PATE-': 'MS-PATI-',
    // Doctor
    'MS-DOC-': 'MS-DOCT-',
    'MS-DOCTOR-': 'MS-DOCT-',
    // Nurse (Bonus for consistency)
    'MS-NUR-': 'MS-NURS-',
    'MS-NURSE-': 'MS-NURS-',
    // Blood Bank (Bonus for consistency)
    'MS-BLOODB-': 'MS-BLOOD-'
};

function standardizeId(id) {
    if (!id || typeof id !== 'string') return id;
    for (const [oldPrefix, newPrefix] of Object.entries(prefixMap)) {
        if (id.startsWith(oldPrefix)) {
            return id.replace(oldPrefix, newPrefix);
        }
    }
    return id;
}

async function migrate() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. User collection
        const users = await User.find({});
        for (let user of users) {
            let changed = false;
            const newMediId = standardizeId(user.mediId);
            const newHospitalMediId = standardizeId(user.hospitalMediId);
            
            if (newMediId !== user.mediId) {
                user.mediId = newMediId;
                changed = true;
            }
            if (newHospitalMediId !== user.hospitalMediId) {
                user.hospitalMediId = newHospitalMediId;
                changed = true;
            }
            if (changed) await user.save();
        }
        console.log('User migration complete');

        // 2. Appointment collection
        const appointments = await Appointment.find({});
        for (let apt of appointments) {
            let changed = false;
            const newPatientId = standardizeId(apt.patientId);
            const newDoctorId = standardizeId(apt.doctorId);
            const newHospitalId = standardizeId(apt.hospitalId);

            if (newPatientId !== apt.patientId) { apt.patientId = newPatientId; changed = true; }
            if (newDoctorId !== apt.doctorId) { apt.doctorId = newDoctorId; changed = true; }
            if (newHospitalId !== apt.hospitalId) { apt.hospitalId = newHospitalId; changed = true; }

            if (changed) await apt.save();
        }
        console.log('Appointment migration complete');

        // 3. Bed collection
        const beds = await Bed.find({});
        for (let bed of beds) {
            let changed = false;
            const newHospitalMediId = standardizeId(bed.hospitalMediId);
            const newPatientId = standardizeId(bed.patientId);

            if (newHospitalMediId !== bed.hospitalMediId) { bed.hospitalMediId = newHospitalMediId; changed = true; }
            if (newPatientId !== bed.patientId) { bed.patientId = newPatientId; changed = true; }

            if (changed) await bed.save();
        }
        console.log('Bed migration complete');

        // 4. BloodDonation collection
        const donations = await BloodDonation.find({});
        for (let donation of donations) {
            const newPatientId = standardizeId(donation.patientId);
            if (newPatientId !== donation.patientId) {
                donation.patientId = newPatientId;
                await donation.save();
            }
        }
        console.log('BloodDonation migration complete');

        // 5. BloodRequest collection
        const bRequests = await BloodRequest.find({});
        for (let req of bRequests) {
            let changed = false;
            const newRequesterId = standardizeId(req.requesterId);
            const newDonorId = standardizeId(req.donorId);
            const newIgnoredBy = (req.ignoredBy || []).map(id => standardizeId(id));

            if (newRequesterId !== req.requesterId) { req.requesterId = newRequesterId; changed = true; }
            if (newDonorId !== req.donorId) { req.donorId = newDonorId; changed = true; }
            if (JSON.stringify(newIgnoredBy) !== JSON.stringify(req.ignoredBy)) { req.ignoredBy = newIgnoredBy; changed = true; }

            if (changed) await req.save();
        }
        console.log('BloodRequest migration complete');

        // 6. Record collection
        const records = await Record.find({});
        for (let rec of records) {
            let changed = false;
            const newHospitalMediId = standardizeId(rec.hospitalMediId);
            const newMediId = standardizeId(rec.mediId);

            if (newHospitalMediId !== rec.hospitalMediId) { rec.hospitalMediId = newHospitalMediId; changed = true; }
            if (newMediId !== rec.mediId) { rec.mediId = newMediId; changed = true; }

            if (changed) await rec.save();
        }
        console.log('Record migration complete');

        // 7. Notification collection
        const notifications = await Notification.find({});
        for (let notif of notifications) {
            let changed = false;
            const newPatientId = standardizeId(notif.patientId);
            const newHospitalId = standardizeId(notif.hospitalId);

            if (newPatientId !== notif.patientId) { notif.patientId = newPatientId; changed = true; }
            if (newHospitalId !== notif.hospitalId) { notif.hospitalId = newHospitalId; changed = true; }

            // Metadata might contain IDs
            if (notif.metadata) {
                const metaString = JSON.stringify(notif.metadata);
                let newMetaString = metaString;
                for (const [oldPrefix, newPrefix] of Object.entries(prefixMap)) {
                    newMetaString = newMetaString.split(oldPrefix).join(newPrefix);
                }
                if (newMetaString !== metaString) {
                    notif.metadata = JSON.parse(newMetaString);
                    changed = true;
                }
            }

            if (changed) await notif.save();
        }
        console.log('Notification migration complete');

        // 8. Transaction collection
        const transactions = await Transaction.find({});
        for (let tx of transactions) {
            let changed = false;
            const newPatientId = standardizeId(tx.patientId);
            const newHospitalId = standardizeId(tx.hospitalId);

            if (newPatientId !== tx.patientId) { tx.patientId = newPatientId; changed = true; }
            if (newHospitalId !== tx.hospitalId) { tx.hospitalId = newHospitalId; changed = true; }

            if (changed) await tx.save();
        }
        console.log('Transaction migration complete');

        console.log('🎉 DATABASE MIGRATION SUCCESSFUL');
        process.exit(0);
    } catch (err) {
        console.error('❌ MIGRATION FAILED:', err);
        process.exit(1);
    }
}

migrate();
