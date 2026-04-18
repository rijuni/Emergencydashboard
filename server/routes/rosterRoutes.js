const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, rosterController.getByDate);
router.get('/shifts', auth, rosterController.getShifts);
router.post('/', auth, roleCheck('casualty_incharge', 'super_admin'), rosterController.create);
router.post('/copy', auth, roleCheck('casualty_incharge', 'super_admin'), rosterController.copyRoster);
router.post('/bulk', auth, roleCheck('casualty_incharge', 'super_admin'), rosterController.bulkAssign);
router.put('/:id', auth, roleCheck('casualty_incharge', 'super_admin'), rosterController.update);
router.delete('/:id', auth, roleCheck('casualty_incharge', 'super_admin'), rosterController.delete);

module.exports = router;
