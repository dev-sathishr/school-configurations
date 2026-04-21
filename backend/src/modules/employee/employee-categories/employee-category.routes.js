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
} = require('./employee-category.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('EMPLOYEE_CATEGORIES'), getAll);
router.get('/:id', checkRecordOwnership('settings.employee_categories', 'EMPLOYEE_CATEGORIES'), getById);
router.post('/', authorizeModule('EMPLOYEE_CATEGORIES', 'CREATE'), create);
router.post('/import', authorizeModule('EMPLOYEE_CATEGORIES', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('EMPLOYEE_CATEGORIES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('EMPLOYEE_CATEGORIES', 'EDIT'), checkRecordOwnership('settings.employee_categories', 'EMPLOYEE_CATEGORIES'), update);
router.delete('/:id', authorizeModule('EMPLOYEE_CATEGORIES', 'DELETE'), checkRecordOwnership('settings.employee_categories', 'EMPLOYEE_CATEGORIES'), remove);

module.exports = router;
