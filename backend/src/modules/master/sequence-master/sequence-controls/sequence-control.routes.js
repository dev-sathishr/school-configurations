const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple } = require('./sequence-control.controller');
const { authenticate, authorizeModule, checkModuleView, checkRecordOwnership } = require('../../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', checkModuleView('SEQUENCE_CONTROLS'), getAll);
router.get('/:id', checkRecordOwnership('settings.sequence_controls', 'SEQUENCE_CONTROLS'), getById);
router.post('/', authorizeModule('SEQUENCE_CONTROLS', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('SEQUENCE_CONTROLS', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('SEQUENCE_CONTROLS', 'EDIT'), checkRecordOwnership('settings.sequence_controls', 'SEQUENCE_CONTROLS'), update);
router.delete('/:id', authorizeModule('SEQUENCE_CONTROLS', 'DELETE'), checkRecordOwnership('settings.sequence_controls', 'SEQUENCE_CONTROLS'), remove);

module.exports = router;
