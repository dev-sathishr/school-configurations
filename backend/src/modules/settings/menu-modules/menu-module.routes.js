const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, importRows } = require('./menu-module.controller');
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('MENU_MODULES', 'CREATE'), create);
router.post('/import', authorizeModule('MENU_MODULES', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('MENU_MODULES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('MENU_MODULES', 'EDIT'), update);
router.delete('/:id', authorizeModule('MENU_MODULES', 'DELETE'), remove);

module.exports = router;
