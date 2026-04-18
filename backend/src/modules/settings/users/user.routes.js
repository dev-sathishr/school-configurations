const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, importRows } = require('./user.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', checkModuleView('USERS'), getAll);
router.get('/:id', checkRecordOwnership('settings.users', 'USERS'), getById);
router.post('/', authorizeModule('USERS', 'CREATE'), create);
router.post('/import', authorizeModule('USERS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('USERS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('USERS', 'EDIT'), checkRecordOwnership('settings.users', 'USERS'), update);
router.delete('/:id', authorizeModule('USERS', 'DELETE'), checkRecordOwnership('settings.users', 'USERS'), remove);

module.exports = router;
