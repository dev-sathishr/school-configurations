const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple } = require('./student-profile.controller');
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorizeModule('ADMISSION_MANAGEMENT', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('ADMISSION_MANAGEMENT', 'DELETE'), removeMultiple);
router.put('/:id', authorizeModule('ADMISSION_MANAGEMENT', 'EDIT'), update);
router.delete('/:id', authorizeModule('ADMISSION_MANAGEMENT', 'DELETE'), remove);

module.exports = router;
