const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows } = require('./group.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('GROUPS'), getAll);
router.get('/:id', checkRecordOwnership('settings.groups', 'GROUPS'), getById);
router.post('/', authorizeModule('GROUPS', 'CREATE'), create);
router.post('/import', authorizeModule('GROUPS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('GROUPS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('GROUPS', 'EDIT'), checkRecordOwnership('settings.groups', 'GROUPS'), update);
router.delete('/:id', authorizeModule('GROUPS', 'DELETE'), checkRecordOwnership('settings.groups', 'GROUPS'), remove);

module.exports = router;
