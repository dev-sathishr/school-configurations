const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove, search } = require('./student-profile-family.controller');

router.use(authenticate);

router.get('/search',         authorizeModule('STUDENT_PROFILE', 'VIEW'), search);
router.get('/',               authorizeModule('STUDENT_PROFILE', 'VIEW'), getAll);
router.get('/:relationId',    authorizeModule('STUDENT_PROFILE', 'VIEW'), getById);
router.post('/',              authorizeModule('STUDENT_PROFILE', 'EDIT'), create);
router.put('/:relationId',    authorizeModule('STUDENT_PROFILE', 'EDIT'), update);
router.delete('/:relationId', authorizeModule('STUDENT_PROFILE', 'EDIT'), remove);

module.exports = router;
