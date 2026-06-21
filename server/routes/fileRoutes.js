const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// List all uploaded files
router.get('/', auth, roleCheck('super_admin', 'admin'), fileController.getFiles);

// Download a specific file by ID
router.get('/download/:id', auth, roleCheck('super_admin', 'admin'), fileController.downloadFile);

// Download a template
router.get('/templates/:type', auth, fileController.downloadTemplate);

// Delete an uploaded file
router.delete('/:id', auth, roleCheck('super_admin'), fileController.deleteFile);

module.exports = router;
