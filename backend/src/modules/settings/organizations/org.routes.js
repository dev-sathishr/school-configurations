const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows } = require('./org.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('ORGANIZATIONS'), getAll);
router.get('/:id', checkRecordOwnership('settings.organizations', 'ORGANIZATIONS'), getById);
router.post('/', authorizeModule('ORGANIZATIONS', 'CREATE'), create);
router.post('/import', authorizeModule('ORGANIZATIONS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('ORGANIZATIONS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('ORGANIZATIONS', 'EDIT'), checkRecordOwnership('settings.organizations', 'ORGANIZATIONS'), update);
router.delete('/:id', authorizeModule('ORGANIZATIONS', 'DELETE'), checkRecordOwnership('settings.organizations', 'ORGANIZATIONS'), remove);

module.exports = router;
