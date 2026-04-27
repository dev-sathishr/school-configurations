const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getNextCode,
  getDropdown,
  getLinkableDropdown,
  create,
  update,
  remove,
  removeMultiple,
} = require('./employee.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/next-code', getNextCode);
router.get('/dropdown', getDropdown);
router.get('/linkable', getLinkableDropdown);
router.get('/', checkModuleView('EMPLOYEE_INFO'), getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('EMPLOYEE_INFO', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('EMPLOYEE_INFO', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('EMPLOYEE_INFO', 'EDIT'), update);
router.delete('/:id', authorizeModule('EMPLOYEE_INFO', 'DELETE'), remove);

module.exports = router;
