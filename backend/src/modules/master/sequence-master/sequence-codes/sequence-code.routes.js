const express = require('express');
const router = express.Router();
const { getAll, getById, getDropdown, create, update, remove, removeMultiple } = require('./sequence-code.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown', getDropdown);
router.get('/', checkModuleView('SEQUENCE_CODES'), getAll);
router.get('/:id', checkRecordOwnership('master.sequence_codes', 'SEQUENCE_CODES'), getById);
router.post('/', authorizeModule('SEQUENCE_CODES', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('SEQUENCE_CODES', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('SEQUENCE_CODES', 'EDIT'), checkRecordOwnership('master.sequence_codes', 'SEQUENCE_CODES'), update);
router.delete('/:id', authorizeModule('SEQUENCE_CODES', 'DELETE'), checkRecordOwnership('master.sequence_codes', 'SEQUENCE_CODES'), remove);

module.exports = router;
