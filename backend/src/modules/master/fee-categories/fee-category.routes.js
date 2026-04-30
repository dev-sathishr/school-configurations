const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./fee-category.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',         getDropdown);
router.get('/',                 checkModuleView('FEE_CATEGORIES'), getAll);
router.get('/:id',              checkRecordOwnership('master.fee_categories', 'FEE_CATEGORIES'), getById);
router.post('/',                authorizeModule('FEE_CATEGORIES', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('FEE_CATEGORIES', 'DELETE'), removeMultiple);
router.put('/:id',              authorizeModule('FEE_CATEGORIES', 'EDIT'),   checkRecordOwnership('master.fee_categories', 'FEE_CATEGORIES'), update);
router.delete('/:id',          authorizeModule('FEE_CATEGORIES', 'DELETE'), checkRecordOwnership('master.fee_categories', 'FEE_CATEGORIES'), remove);

module.exports = router;
