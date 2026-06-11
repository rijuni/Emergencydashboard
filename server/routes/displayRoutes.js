const express = require('express');
const router = express.Router();
const displayController = require('../controllers/displayController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public endpoints (no auth)
router.get('/today', displayController.getToday);
router.get('/settings', displayController.getSettings);

const multer = require('multer');
const upload = multer({ dest: 'uploads/temp/' });

// Protected endpoints
router.put('/settings', auth, roleCheck('super_admin'), displayController.updateSettings);
router.post('/settings/import-monthly-duty', auth, roleCheck('super_admin'), upload.single('file'), displayController.importMonthlyDuty);
router.post('/settings/manual-mod', auth, roleCheck('super_admin', 'admin'), displayController.updateManualMod);
router.post('/settings/restore-mod', auth, roleCheck('super_admin', 'admin'), displayController.restoreMod);
router.get('/settings/download-mod-schedule', auth, roleCheck('super_admin', 'admin'), displayController.downloadModSchedule);
router.get('/dashboard-stats', auth, displayController.getDashboardStats);

module.exports = router;
