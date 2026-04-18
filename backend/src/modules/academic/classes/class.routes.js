const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, getDropdown, importRows } = require('./class.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('CLASSES'), getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('CLASSES', 'CREATE'), create);
router.post('/import', authorizeModule('CLASSES', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('CLASSES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('CLASSES', 'EDIT'), update);
router.delete('/:id', authorizeModule('CLASSES', 'DELETE'), remove);

module.exports = router;
