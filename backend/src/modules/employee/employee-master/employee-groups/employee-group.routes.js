const express = require('express');
const router = express.Router();
const {
  getAll,
  getById,
  getDropdown,
  create,
  update,
  remove,
  removeMultiple,
  importRows,
} = require('./employee-group.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('EMPLOYEE_GROUPS'), getAll);
router.get('/:id', checkRecordOwnership('employee.employee_groups', 'EMPLOYEE_GROUPS'), getById);
router.post('/', authorizeModule('EMPLOYEE_GROUPS', 'CREATE'), create);
router.post('/import', authorizeModule('EMPLOYEE_GROUPS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('EMPLOYEE_GROUPS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('EMPLOYEE_GROUPS', 'EDIT'), checkRecordOwnership('employee.employee_groups', 'EMPLOYEE_GROUPS'), update);
router.delete('/:id', authorizeModule('EMPLOYEE_GROUPS', 'DELETE'), checkRecordOwnership('employee.employee_groups', 'EMPLOYEE_GROUPS'), remove);

module.exports = router;
