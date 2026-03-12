const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// 1. Get Dashboard Stats (Counts of each role)
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            hospitals: await User.countDocuments({ role: 'HOSPITAL' }),
            labs: await User.countDocuments({ role: 'LAB' }),
            ambulances: await User.countDocuments({ role: 'AMB' }),
            pharmacies: await User.countDocuments({ role: 'PHA' }),
            patients: await User.countDocuments({ role: 'PAT' }),
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: "Error fetching stats", error: err });
    }
});

// 2. View All Users by Role (For the tables)
router.get('/view-all/:role', async (req, res) => {
    try {
        const users = await User.find({ role: req.params.role });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching data", error: err });
    }
});

// 3. Delete a User/Entity
router.delete('/delete-entity/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Delete failed" });
    }
});

module.exports = router;