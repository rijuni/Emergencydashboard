const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// List all uploaded files
router.get('/', auth, roleCheck('super_admin', 'admin', 'casualty_incharge'), fileController.getFiles);

// Download a specific file by ID
router.get('/download/:id', auth, roleCheck('super_admin', 'admin', 'casualty_incharge'), fileController.downloadFile);

// Download a template
router.get('/templates/:type', auth, fileController.downloadTemplate);

module.exports = router;
