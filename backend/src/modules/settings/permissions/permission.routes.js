const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./permission.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('PERMISSIONS'), getAll);
router.get('/:id', checkRecordOwnership('settings.permissions', 'PERMISSIONS'), getById);
router.post('/', authorizeModule('PERMISSIONS', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('PERMISSIONS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('PERMISSIONS', 'EDIT'), checkRecordOwnership('settings.permissions', 'PERMISSIONS'), update);
router.delete('/:id', authorizeModule('PERMISSIONS', 'DELETE'), checkRecordOwnership('settings.permissions', 'PERMISSIONS'), remove);

module.exports = router;
