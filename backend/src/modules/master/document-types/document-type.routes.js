const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./document-type.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',      getDropdown);
router.get('/',              checkModuleView('DOCUMENT_TYPES'), getAll);
router.get('/:id',           checkRecordOwnership('master.document_types', 'DOCUMENT_TYPES'), getById);
router.post('/',             authorizeModule('DOCUMENT_TYPES', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('DOCUMENT_TYPES', 'DELETE'), removeMultiple);
router.put('/:id',           authorizeModule('DOCUMENT_TYPES', 'EDIT'),   checkRecordOwnership('master.document_types', 'DOCUMENT_TYPES'), update);
router.delete('/:id',        authorizeModule('DOCUMENT_TYPES', 'DELETE'), checkRecordOwnership('master.document_types', 'DOCUMENT_TYPES'), remove);

module.exports = router;
