const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove } = require('./student-profile-family.controller');

router.use(authenticate);

router.get('/',               authorizeModule('ADMISSION_MANAGEMENT', 'VIEW'), getAll);
router.get('/:relationId',    authorizeModule('ADMISSION_MANAGEMENT', 'VIEW'), getById);
router.post('/',              authorizeModule('ADMISSION_MANAGEMENT', 'EDIT'), create);
router.put('/:relationId',    authorizeModule('ADMISSION_MANAGEMENT', 'EDIT'), update);
router.delete('/:relationId', authorizeModule('ADMISSION_MANAGEMENT', 'EDIT'), remove);

module.exports = router;
