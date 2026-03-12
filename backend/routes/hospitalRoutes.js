const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');

router.get('/appointments/:hospitalId', hospitalController.getAppointments);
router.get('/beds/:hospitalId', hospitalController.getBeds);
router.put('/beds/update', hospitalController.updateBedStatus);

module.exports = router;
