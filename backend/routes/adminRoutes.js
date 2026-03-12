const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/stats', adminController.getStats);
router.get('/view-all/:role', adminController.viewAll);
router.post('/add-hospital', adminController.addEntity);
router.delete('/delete-entity/:id', adminController.deleteEntity);
router.put('/toggle-status/:id', adminController.toggleStatus);
router.put('/update-entity/:id', adminController.updateEntity);

module.exports = router;
