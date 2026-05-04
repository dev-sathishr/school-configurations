const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, getNextCode, create, update, remove, removeMultiple } = require('./assessment.controller');

router.use(authenticate);

router.get('/next-code',        authorizeModule('ASSESSMENTS', 'CREATE'), getNextCode);
router.get('/',                 authorizeModule('ASSESSMENTS', 'VIEW'),   getAll);
router.get('/:id',              authorizeModule('ASSESSMENTS', 'VIEW'),   getById);
router.post('/',                authorizeModule('ASSESSMENTS', 'CREATE'), create);
router.put('/:id',              authorizeModule('ASSESSMENTS', 'EDIT'),   update);
router.delete('/:id',           authorizeModule('ASSESSMENTS', 'DELETE'), remove);
router.post('/delete-multiple', authorizeModule('ASSESSMENTS', 'DELETE'), removeMultiple);

module.exports = router;
