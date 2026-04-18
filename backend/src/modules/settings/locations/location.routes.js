const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows } = require('./location.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('LOCATIONS'), getAll);
router.get('/:id', checkRecordOwnership('settings.locations', 'LOCATIONS'), getById);
router.post('/', authorizeModule('LOCATIONS', 'CREATE'), create);
router.post('/import', authorizeModule('LOCATIONS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('LOCATIONS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('LOCATIONS', 'EDIT'), checkRecordOwnership('settings.locations', 'LOCATIONS'), update);
router.delete('/:id', authorizeModule('LOCATIONS', 'DELETE'), checkRecordOwnership('settings.locations', 'LOCATIONS'), remove);

module.exports = router;
