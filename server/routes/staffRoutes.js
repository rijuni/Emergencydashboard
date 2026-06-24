const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, staffController.getAll);
router.get('/check-registration', auth, staffController.checkRegistration);
router.get('/master/doctors', auth, roleCheck('admin', 'super_admin'), staffController.getDoctors);
router.get('/master/employees', auth, roleCheck('admin', 'super_admin'), staffController.getEmployees);
router.get('/categories/all', auth, roleCheck('admin', 'super_admin'), staffController.getAllCategories);
router.get('/categories', auth, staffController.getCategories);
router.post('/categories', auth, roleCheck('admin', 'super_admin'), staffController.createCategory);
router.put('/categories/:id', auth, roleCheck('admin', 'super_admin'), staffController.updateCategory);
router.delete('/categories/:id', auth, roleCheck('admin', 'super_admin'), staffController.deleteCategory);

router.get('/:id', auth, staffController.getById);
router.post('/bulk', auth, roleCheck('admin', 'super_admin'), staffController.bulkCreate);
router.post('/', auth, roleCheck('admin', 'super_admin'), staffController.create);
router.put('/:id', auth, roleCheck('admin', 'super_admin'), staffController.update);
router.delete('/:id', auth, roleCheck('admin', 'super_admin'), staffController.delete);

module.exports = router;
