const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, staffController.getAll);
router.get('/master/doctors', auth, roleCheck('super_admin'), staffController.getDoctors);
router.get('/master/employees', auth, roleCheck('super_admin'), staffController.getEmployees);
router.get('/categories', auth, staffController.getCategories);
router.get('/:id', auth, staffController.getById);
router.post('/bulk', auth, roleCheck('super_admin'), staffController.bulkCreate);
router.post('/', auth, roleCheck('super_admin'), staffController.create);
router.put('/:id', auth, roleCheck('super_admin'), staffController.update);
router.delete('/:id', auth, roleCheck('super_admin'), staffController.delete);

module.exports = router;
