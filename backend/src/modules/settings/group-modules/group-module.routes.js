const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, importRows } = require('./group-module.controller');
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('GROUP_MODULES', 'CREATE'), create);
router.post('/import', authorizeModule('GROUP_MODULES', 'IMPORT'), importRows);
router.post('/delete-multiple', authorizeModule('GROUP_MODULES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('GROUP_MODULES', 'EDIT'), update);
router.delete('/:id', authorizeModule('GROUP_MODULES', 'DELETE'), remove);

module.exports = router;
