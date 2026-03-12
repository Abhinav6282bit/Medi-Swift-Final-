const User = require('../models/User');
const notificationService = require('../utils/notificationService');

const generateMediId = (role) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const upperRole = role.toUpperCase();
    const prefixMap = {
        'PATIENT': 'PATI',
        'PHARMACY': 'PHAR',
        'DOCTOR': 'DOCT',
        'LAB': 'LAB',
        'HOSPITAL': 'HOSP',
        'BLOOD_BANK': 'BLOOD',
        'NURSE': 'NUR',
        'AMBULANCE': 'AMBU',
    };
    const prefix = prefixMap[upperRole] || upperRole.substring(0, 4);
    return `MS-${prefix}-${randomNum}`;
};

exports.registerBloodBank = async (req, res) => {
    try {
        const { bloodBankName, licenseNo, address, phone, email, password } = req.body;

        if (!bloodBankName || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // --- DUPLICATE CHECK ---
        const lowerEmail = email.toLowerCase();
        const existingUser = await User.findOne({ email: lowerEmail });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

        const mediId = generateMediId('BLOOD_BANK');
        const newUser = new User({
            ...req.body,
            role: 'BLOOD_BANK',
            mediId,
            email: lowerEmail,
            bloodBankName,
            password
        });
        await newUser.save();

        // Initialize stock
        const BloodStock = require('../models/BloodStock');
        const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        await BloodStock.insertMany(bloodGroups.map(bg => ({ bloodBankId: mediId, bloodGroup: bg, units: 0 })));

        await notificationService.sendWelcomeMessage({
            firstName: bloodBankName,
            mediId,
            email: lowerEmail,
            role: 'BLOOD_BANK'
        });

        res.json({ success: true, message: 'Blood Bank Registered Successfully', generatedId: mediId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerHospital = async (req, res) => {
    try {
        const { hospitalName, email, password } = req.body;
        if (!hospitalName || !email || !password) return res.status(400).json({ success: false, message: 'Missing required fields' });

        const lowerEmail = email.toLowerCase();
        const existingUser = await User.findOne({ email: lowerEmail });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists with this email' });

        const mediId = generateMediId('HOSPITAL');
        const newUser = new User({
            ...req.body,
            role: 'HOSPITAL',
            mediId,
            email: lowerEmail,
            password
        });
        await newUser.save();

        await notificationService.sendWelcomeMessage({
            firstName: hospitalName,
            mediId,
            email: lowerEmail,
            role: 'HOSPITAL'
        });

        res.json({ success: true, message: 'Hospital Registered Successfully', generatedId: mediId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendOtp = async (req, res) => {
    try {
        const { identifier } = req.body; // Can be email or mediId
        const user = await User.findOne({
            $or: [{ email: identifier }, { mediId: identifier }]
        });

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        console.log(`[MOCK EMAIL SERVICE] OTP for ${user.email} (${user.mediId}): ${otp}`);

        res.json({ success: true, message: "OTP sent to your registered email (Check Server Console)" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        const user = await User.findOne({
            $or: [{ email: identifier }, { mediId: identifier }],
            otp: otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ success: false, message: "Invalid or Expired OTP" });

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Password reset successfully. Please login." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerUser = async (req, res) => {
    try {
        const { role, firstName, lastName, email, phone, password, aadharNumber, licenseNo, vehicleNo, address, specialization, driverName } = req.body;
        const photoUrl = req.file ? req.file.path : null;

        if (!photoUrl) return res.status(400).json({ success: false, message: "Profile Photo is Mandatory" });
        if (!aadharNumber || aadharNumber.length !== 12) return res.status(400).json({ success: false, message: "Valid 12-digit Aadhar Number is Mandatory" });

        const lowerEmail = email ? email.toLowerCase() : null;
        const query = { $or: [] };
        if (lowerEmail) query.$or.push({ email: lowerEmail });
        if (aadharNumber) query.$or.push({ aadharNumber });

        if (query.$or.length > 0) {
            const existingUser = await User.findOne(query);
            if (existingUser) {
                const conflictField = existingUser.email === lowerEmail ? "Email" : "Aadhar";
                return res.status(400).json({ success: false, message: `User with this ${conflictField} already exists` });
            }
        }

        const mediId = generateMediId(role);

        const newUser = new User({
            role,
            firstName,
            lastName,
            email: lowerEmail,
            phone,
            password,
            aadharNumber,
            photoUrl,
            mediId,
            licenseNo,
            vehicleNo,
            address,
            specialization,
            driverName
        });

        await newUser.save();

        await notificationService.sendWelcomeMessage({
            firstName,
            lastName,
            mediId,
            email: lowerEmail,
            phone,
            role
        });

        res.status(201).json({ success: true, message: `${role} Registered Successfully`, mediId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { mediId, password } = req.body;
        let normalizedId = mediId ? mediId.trim().toUpperCase() : "";

        // Resilient search criteria — handles prefix mismatches for all roles
        const searchTerms = [normalizedId];

        // DOCTOR: DOCT ↔ DOC
        if (normalizedId.startsWith("MS-DOCT-")) {
            searchTerms.push(normalizedId.replace("MS-DOCT-", "MS-DOC-"));
        }
        if (normalizedId.startsWith("MS-DOC-") && !normalizedId.startsWith("MS-DOCT-")) {
            searchTerms.push(normalizedId.replace("MS-DOC-", "MS-DOCT-"));
        }

        // NURSE: NUR ↔ NURS
        if (normalizedId.startsWith("MS-NURS-")) {
            searchTerms.push(normalizedId.replace("MS-NURS-", "MS-NUR-"));
        }
        if (normalizedId.startsWith("MS-NUR-") && !normalizedId.startsWith("MS-NURS-")) {
            searchTerms.push(normalizedId.replace("MS-NUR-", "MS-NURS-"));
        }

        // PHARMACY: PHA ↔ PHAR ↔ PHARM
        if (normalizedId.startsWith("MS-PHA-")) {
            searchTerms.push(normalizedId.replace("MS-PHA-", "MS-PHAR-"));
            searchTerms.push(normalizedId.replace("MS-PHA-", "MS-PHARM-"));
        }
        if (normalizedId.startsWith("MS-PHAR-") && !normalizedId.startsWith("MS-PHARM-")) {
            searchTerms.push(normalizedId.replace("MS-PHAR-", "MS-PHA-"));
            searchTerms.push(normalizedId.replace("MS-PHAR-", "MS-PHARM-"));
        }
        if (normalizedId.startsWith("MS-PHARM-")) {
            searchTerms.push(normalizedId.replace("MS-PHARM-", "MS-PHA-"));
            searchTerms.push(normalizedId.replace("MS-PHARM-", "MS-PHAR-"));
        }

        // AMBULANCE: AMB ↔ AMBU ↔ AMBUL
        if (normalizedId.startsWith("MS-AMB-")) {
            searchTerms.push(normalizedId.replace("MS-AMB-", "MS-AMBU-"));
            searchTerms.push(normalizedId.replace("MS-AMB-", "MS-AMBUL-"));
        }
        if (normalizedId.startsWith("MS-AMBU-")) {
            searchTerms.push(normalizedId.replace("MS-AMBU-", "MS-AMB-"));
        }
        if (normalizedId.startsWith("MS-AMBUL-")) {
            searchTerms.push(normalizedId.replace("MS-AMBUL-", "MS-AMB-"));
        }

        // PATIENT: PATI ↔ PAT
        if (normalizedId.startsWith("MS-PATI-")) {
            searchTerms.push(normalizedId.replace("MS-PATI-", "MS-PAT-"));
        }
        if (normalizedId.startsWith("MS-PAT-") && !normalizedId.startsWith("MS-PATI-")) {
            searchTerms.push(normalizedId.replace("MS-PAT-", "MS-PATI-"));
        }

        // BLOOD_BANK: BLOOD ↔ BLOODB
        if (normalizedId.startsWith("MS-BLOOD-")) {
            searchTerms.push(normalizedId.replace("MS-BLOOD-", "MS-BLOODB-"));
        }
        if (normalizedId.startsWith("MS-BLOODB-")) {
            searchTerms.push(normalizedId.replace("MS-BLOODB-", "MS-BLOOD-"));
        }

        const user = await User.findOne({
            $or: [
                ...searchTerms.map(term => ({ mediId: { $regex: new RegExp("^" + term + "$", "i") } })),
                { hospitalName: { $regex: new RegExp("^" + normalizedId + "$", "i") } }
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Medi-ID not found" });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, message: "Your account has been blocked by the Administrator." });
        }

        // Determine correct hospitalId (The unique Medi-ID)
        let hospitalId = user.hospitalMediId;
        if (user.role === 'HOSPITAL') {
            hospitalId = user.mediId;
        }

        // Resilient fallback: if hospitalId is missing but hospitalName exists, resolve it
        if (!hospitalId && user.hospitalName) {
            const h = await User.findOne({ hospitalName: user.hospitalName, role: 'HOSPITAL' });
            if (h) hospitalId = h.mediId;
        }

        res.json({
            success: true,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            specialization: user.specialization,
            hospitalId: hospitalId,
            hospitalName: user.hospitalName,
            mediId: user.mediId,
            userData: user
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addHospitalPersonnel = async (req, res) => {
    try {
        const { role, firstName, email, password, hospitalName, hospitalMediId, aadharNumber } = req.body;

        const lowerEmail = email ? email.toLowerCase() : null;
        if (lowerEmail) {
            const existing = await User.findOne({ email: lowerEmail });
            if (existing) return res.status(400).json({ success: false, message: "User with this Email already exists" });
        }

        const photoUrl = req.file ? req.file.path : null;
        const mediId = generateMediId(role);

        const newUser = new User({
            ...req.body,
            role,
            firstName,
            email: lowerEmail,
            mediId,
            password,
            photoUrl,
            hospitalName,
            hospitalMediId
        });

        await newUser.save();
        res.json({ success: true, generatedId: mediId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.removeHospitalPersonnel = async (req, res) => {
    try {
        const { mediId } = req.params;
        const { hospitalMediId } = req.query;

        const result = await User.findOneAndDelete({
            mediId,
            $or: [{ hospitalMediId }, { hospitalName: hospitalMediId }]
        });
        if (!result) return res.status(404).json({ success: false, message: "Personnel not found or unauthorized" });

        res.json({ success: true, message: "Personnel removed successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateHospitalPersonnel = async (req, res) => {
    try {
        const { mediId } = req.params;
        const { hospitalMediId, firstName, email, phone, specialization, role } = req.body;
        const photoUrl = req.file ? req.file.path : undefined;

        const updateData = { firstName, email, phone, specialization, role };
        if (photoUrl) updateData.photoUrl = photoUrl;

        const updated = await User.findOneAndUpdate(
            { mediId, $or: [{ hospitalMediId }, { hospitalName: hospitalMediId }] },
            { $set: updateData },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: "Personnel not found or unauthorized" });

        res.json({ success: true, message: "Personnel updated successfully", data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.togglePersonnelStatus = async (req, res) => {
    try {
        const { mediId } = req.params;
        const { hospitalMediId } = req.body;

        const user = await User.findOne({ mediId, $or: [{ hospitalMediId }, { hospitalName: hospitalMediId }] });
        if (!user) return res.status(404).json({ success: false, message: "Personnel not found or unauthorized" });

        user.status = user.status === 'blocked' ? 'active' : 'blocked';
        await user.save();

        res.json({ success: true, message: `Personnel ${user.status === 'blocked' ? 'blocked' : 'unblocked'} successfully`, status: user.status });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};