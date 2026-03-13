const Appointment = require('../models/Appointment');
const Bed = require('../models/Bed');
const User = require('../models/User');

exports.getAppointments = async (req, res) => {
    try {
        const hospitalQuery = req.params.hospitalId;
        const appointments = await Appointment.find({
            $or: [{ hospitalId: hospitalQuery }, { hospitalName: hospitalQuery }]
        });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBeds = async (req, res) => {
    try {
        const hospitalMediId = req.params.hospitalId;
        console.log(`Fetching beds for hospital: ${hospitalMediId}`);
        let beds = await Bed.find({ hospitalMediId });

        if (!beds || beds.length === 0) {
            console.log(`No beds found for ${hospitalMediId}. Getting setup capacities...`);
            const hospital = await User.findOne({ mediId: hospitalMediId, role: 'HOSPITAL' });

            // Fallbacks in case hospital was registered before this feature
            const genCount = hospital?.generalBeds || 20;
            const icuCount = hospital?.icuBeds || 10;
            const matCount = hospital?.maternityBeds || 5;

            const newBeds = [];
            for (let i = 1; i <= genCount; i++) {
                newBeds.push({ hospitalMediId, ward: 'General', bedNumber: `GN-${i}`, status: 'Available' });
            }
            for (let i = 1; i <= icuCount; i++) {
                newBeds.push({ hospitalMediId, ward: 'ICU', bedNumber: `ICU-${i}`, status: 'Available' });
            }
            for (let i = 1; i <= matCount; i++) {
                newBeds.push({ hospitalMediId, ward: 'Maternity', bedNumber: `MT-${i}`, status: 'Available' });
            }
            const inserted = await Bed.insertMany(newBeds);
            console.log(`Successfully inserted ${inserted.length} beds.`);

            // Re-fetch to ensure we have the Mongoose documents with _id
            beds = await Bed.find({ hospitalMediId });
        }

        console.log(`Returning ${beds.length} beds.`);

        // Also fetch and return the hospital's configuration for UI initialization
        const hospital = await User.findOne({ mediId: hospitalMediId, role: 'HOSPITAL' });

        res.json({
            success: true,
            beds,
            config: {
                general: hospital?.generalBeds || 0,
                icu: hospital?.icuBeds || 0,
                maternity: hospital?.maternityBeds || 0,
                customWards: hospital?.customWards || []
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBedStatus = async (req, res) => {
    try {
        const { bedId, status, patientName, patientId } = req.body;
        const updatedBed = await Bed.findByIdAndUpdate(
            bedId,
            { status, patientName: patientName || null, patientId: patientId || null },
            { new: true }
        );

        // If assigning a patient to a bed, try to find their active appointment and link it
        if (status === 'Occupied' || status === 'Reserved') {
            if (patientId) {
                // Find most recent appointment for this patient that is not yet discharged and not billed
                const apt = await Appointment.findOne({ 
                    patientId: patientId,
                    ipdBillStatus: 'None'
                }).sort({ date: -1 });

                if (apt && !apt.isAdmitted) {
                    apt.isAdmitted = true;
                    apt.assignedBed = updatedBed.bedNumber;
                    apt.assignedWard = updatedBed.ward;
                    apt.admissionDate = new Date();
                    await apt.save();
                }
            } else if (patientName) {
                // Fallback by name
                const apt = await Appointment.findOne({ 
                    patientName: { $regex: new RegExp('^' + patientName + '$', 'i') },
                    ipdBillStatus: 'None'
                }).sort({ date: -1 });

                if (apt && !apt.isAdmitted) {
                    apt.isAdmitted = true;
                    apt.assignedBed = updatedBed.bedNumber;
                    apt.assignedWard = updatedBed.ward;
                    apt.admissionDate = new Date();
                    await apt.save();
                }
            }
        } else if (status === 'Available') {
            // If marking bed as Available manually, we might want to unlink the appointment
            // But discharge process handles this typically. If done manually, we just free the bed.
        }

        res.json({ success: true, bed: updatedBed });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateHospitalCapacity = async (req, res) => {
    try {
        const { hospitalMediId, general, icu, maternity, customWards = [] } = req.body;

        const hospital = await User.findOneAndUpdate(
            { mediId: hospitalMediId, role: 'HOSPITAL' },
            {
                generalBeds: general,
                icuBeds: icu,
                maternityBeds: maternity,
                customWards: customWards.map(cw => ({ name: cw.name, count: cw.count }))
            },
            { new: true }
        );

        if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" });

        // Build the full wards list (standard + custom)
        const standardWards = [
            { name: 'General', count: general, prefix: 'GN' },
            { name: 'ICU', count: icu, prefix: 'ICU' },
            { name: 'Maternity', count: maternity, prefix: 'MT' }
        ];

        const customWardList = (customWards || []).map(cw => ({
            name: cw.name,
            count: cw.count,
            // Create a prefix from first 2-3 uppercase letters of ward name
            prefix: cw.name.replace(/\s+/g, '').substring(0, 3).toUpperCase()
        }));

        const allWards = [...standardWards, ...customWardList];

        for (const ward of allWards) {
            const currentBeds = await Bed.find({ hospitalMediId, ward: ward.name }).sort({ bedNumber: 1 });
            const currentCount = currentBeds.length;

            if (ward.count > currentCount) {
                const newBeds = [];
                for (let i = currentCount + 1; i <= ward.count; i++) {
                    newBeds.push({
                        hospitalMediId,
                        ward: ward.name,
                        bedNumber: `${ward.prefix}-${i}`,
                        status: 'Available'
                    });
                }
                await Bed.insertMany(newBeds);
            } else if (ward.count < currentCount) {
                const toRemove = currentBeds
                    .filter(b => {
                        const parts = b.bedNumber.split('-');
                        const num = parseInt(parts[parts.length - 1]);
                        return num > ward.count;
                    })
                    .filter(b => b.status === 'Available');

                for (const b of toRemove) {
                    await Bed.findByIdAndDelete(b._id);
                }
            }
        }

        res.json({ success: true, message: "Capacity updated and synchronized" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteWard = async (req, res) => {
    try {
        const { hospitalMediId, wardName } = req.body;
        if (!hospitalMediId || !wardName) return res.status(400).json({ success: false, message: 'Missing hospitalMediId or wardName' });

        // 1. Delete available beds from Beds collection
        const result = await Bed.deleteMany({ hospitalMediId, ward: wardName, status: 'Available' });

        // 2. Update User document to persist the deletion (count = 0 or remove from array)
        if (['General', 'ICU', 'Maternity'].includes(wardName)) {
            const field = wardName === 'General' ? 'generalBeds' : wardName === 'ICU' ? 'icuBeds' : 'maternityBeds';
            await User.findOneAndUpdate({ mediId: hospitalMediId, role: 'HOSPITAL' }, { [field]: 0 });
        } else {
            await User.findOneAndUpdate(
                { mediId: hospitalMediId, role: 'HOSPITAL' },
                { $pull: { customWards: { name: wardName } } }
            );
        }

        res.json({ success: true, message: `Deleted ${result.deletedCount} available beds from ${wardName} ward.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
