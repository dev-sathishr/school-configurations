const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeModule } = require('../../../shared/middleware/auth.middleware');
const { getAll, getById, create, update, remove, removeMultiple } = require('./recommendation-mapping.controller');

router.use(authenticate);

router.get('/',                 authorizeModule('RECOMMENDATIONS', 'VIEW'),   getAll);
router.get('/:id',              authorizeModule('RECOMMENDATIONS', 'VIEW'),   getById);
router.post('/',                authorizeModule('RECOMMENDATIONS', 'CREATE'), create);
router.put('/:id',              authorizeModule('RECOMMENDATIONS', 'EDIT'),   update);
router.delete('/:id',           authorizeModule('RECOMMENDATIONS', 'DELETE'), remove);
router.post('/delete-multiple', authorizeModule('RECOMMENDATIONS', 'DELETE'), removeMultiple);

module.exports = router;
