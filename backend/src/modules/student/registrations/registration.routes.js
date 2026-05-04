const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, getNextCode, create, update, remove, removeMultiple } = require('./registration.controller');

router.use(authenticate);

router.get('/next-code',        authorizeModule('REGISTRATIONS', 'CREATE'), getNextCode);
router.get('/',                 authorizeModule('REGISTRATIONS', 'VIEW'),   getAll);
router.get('/:id',              authorizeModule('REGISTRATIONS', 'VIEW'),   getById);
router.post('/',                authorizeModule('REGISTRATIONS', 'CREATE'), create);
router.put('/:id',              authorizeModule('REGISTRATIONS', 'EDIT'),   update);
router.delete('/:id',           authorizeModule('REGISTRATIONS', 'DELETE'), remove);
router.post('/delete-multiple', authorizeModule('REGISTRATIONS', 'DELETE'), removeMultiple);

module.exports = router;
