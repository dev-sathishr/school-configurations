const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove, removeMultiple } = require('./enquiry.controller');

router.use(authenticate);

router.get('/',                authorizeModule('ENQUIRY', 'VIEW'),   getAll);
router.get('/:id',             authorizeModule('ENQUIRY', 'VIEW'),   getById);
router.post('/',               authorizeModule('ENQUIRY', 'CREATE'), create);
router.put('/:id',             authorizeModule('ENQUIRY', 'EDIT'),   update);
router.delete('/:id',          authorizeModule('ENQUIRY', 'DELETE'), remove);
router.post('/delete-multiple', authorizeModule('ENQUIRY', 'DELETE'), removeMultiple);

module.exports = router;
