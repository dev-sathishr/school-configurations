const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove, removeMultiple, getDropdown } = require('./academic-year.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',       getDropdown);
router.get('/',               checkModuleView('ACADEMIC_YEARS'), getAll);
router.get('/:id',            getById);
router.post('/',              authorizeModule('ACADEMIC_YEARS', 'CREATE'), create);
router.post('/delete-multiple', authorizeModule('ACADEMIC_YEARS', 'DELETE'), removeMultiple);
router.put('/:id',            authorizeModule('ACADEMIC_YEARS', 'EDIT'), update);
router.delete('/:id',         authorizeModule('ACADEMIC_YEARS', 'DELETE'), remove);

module.exports = router;
