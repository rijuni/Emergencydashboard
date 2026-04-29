const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/login', authController.login);
router.post('/register', auth, roleCheck('super_admin'), authController.register);
router.get('/me', auth, authController.getMe);
router.put('/change-password', auth, authController.changePassword);
router.get('/users', auth, roleCheck('super_admin'), authController.getUsers);
router.put('/users/:id/toggle', auth, roleCheck('super_admin'), authController.toggleUserStatus);
router.put('/users/:id/reset-password', auth, roleCheck('super_admin'), authController.resetUserPassword);

module.exports = router;
