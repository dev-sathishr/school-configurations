const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, getMenusWithModules, create, update, remove, removeMultiple, importRows } = require('./menu.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/with-modules', getMenusWithModules);
router.get('/', checkModuleView('MENUS'), getAll);
router.get('/:id', checkRecordOwnership('settings.menus', 'MENUS'), getById);
router.post('/', authorizeModule('MENUS', 'CREATE'), create);
router.post('/import', authorizeModule('MENUS', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('MENUS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('MENUS', 'EDIT'), checkRecordOwnership('settings.menus', 'MENUS'), update);
router.delete('/:id', authorizeModule('MENUS', 'DELETE'), checkRecordOwnership('settings.menus', 'MENUS'), remove);

module.exports = router;
