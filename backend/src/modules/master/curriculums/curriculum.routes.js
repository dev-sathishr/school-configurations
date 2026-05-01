const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./curriculum.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',         getDropdown);
router.get('/',                 checkModuleView('CURRICULUM'), getAll);
router.get('/:id',              checkRecordOwnership('master.curriculum', 'CURRICULUM'), getById);
router.post('/',                authorizeModule('CURRICULUM', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('CURRICULUM', 'DELETE'), removeMultiple);
router.put('/:id',              authorizeModule('CURRICULUM', 'EDIT'),   checkRecordOwnership('master.curriculum', 'CURRICULUM'), update);
router.delete('/:id',           authorizeModule('CURRICULUM', 'DELETE'), checkRecordOwnership('master.curriculum', 'CURRICULUM'), remove);

module.exports = router;
