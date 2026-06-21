const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, rosterController.getByDate);
router.get('/shifts', auth, rosterController.getShifts);
router.post('/shifts', auth, roleCheck('super_admin'), rosterController.createShift);
router.put('/shifts/:id', auth, roleCheck('super_admin'), rosterController.updateShift);
router.put('/shifts/:id/toggle', auth, roleCheck('super_admin'), rosterController.toggleShift);
router.post('/', auth, roleCheck('admin', 'super_admin'), rosterController.create);
router.post('/copy', auth, roleCheck('admin', 'super_admin'), rosterController.copyRoster);
router.post('/bulk', auth, roleCheck('admin', 'super_admin'), rosterController.bulkAssign);
router.put('/:id', auth, roleCheck('admin', 'super_admin'), rosterController.update);
router.delete('/:id', auth, roleCheck('super_admin'), rosterController.delete);

module.exports = router;
