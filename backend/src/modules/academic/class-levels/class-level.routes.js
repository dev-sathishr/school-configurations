const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple } = require('./class-level.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', checkModuleView('CLASS_LEVELS'), getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('CLASS_LEVELS', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('CLASS_LEVELS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('CLASS_LEVELS', 'EDIT'), update);
router.delete('/:id', authorizeModule('CLASS_LEVELS', 'DELETE'), remove);

module.exports = router;
