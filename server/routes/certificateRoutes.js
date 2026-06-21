const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.get('/', auth, roleCheck('super_admin','admin'), certificateController.getAll);
router.post('/', auth, roleCheck('super_admin','admin'), upload.single('file'), certificateController.upload);
router.get('/:id/download', auth, roleCheck('super_admin','admin'), certificateController.download);
router.delete('/:id', auth, roleCheck('super_admin'), certificateController.delete);

module.exports = router;
