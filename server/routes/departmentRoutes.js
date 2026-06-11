const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All logged-in staff can get departments (e.g. for dropdowns)
router.get('/', auth, departmentController.getAll);

// Only super admin can manage the department master
router.post('/', auth, roleCheck('super_admin'), departmentController.create);
router.delete('/:id', auth, roleCheck('super_admin'), departmentController.delete);

module.exports = router;
