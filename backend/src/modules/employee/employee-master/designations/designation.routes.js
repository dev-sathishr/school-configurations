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
} = require('./designation.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('DESIGNATIONS'), getAll);
router.get('/:id', checkRecordOwnership('employee.designations', 'DESIGNATIONS'), getById);
router.post('/', authorizeModule('DESIGNATIONS', 'CREATE'), create);
router.post('/import', authorizeModule('DESIGNATIONS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('DESIGNATIONS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('DESIGNATIONS', 'EDIT'), checkRecordOwnership('employee.designations', 'DESIGNATIONS'), update);
router.delete('/:id', authorizeModule('DESIGNATIONS', 'DELETE'), checkRecordOwnership('employee.designations', 'DESIGNATIONS'), remove);

module.exports = router;
