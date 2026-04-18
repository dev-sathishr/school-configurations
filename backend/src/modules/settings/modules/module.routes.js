const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./module.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('MODULES'), getAll);
router.get('/:id', checkRecordOwnership('settings.modules', 'MODULES'), getById);
router.post('/', authorizeModule('MODULES', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('MODULES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('MODULES', 'EDIT'), checkRecordOwnership('settings.modules', 'MODULES'), update);
router.delete('/:id', authorizeModule('MODULES', 'DELETE'), checkRecordOwnership('settings.modules', 'MODULES'), remove);

module.exports = router;
