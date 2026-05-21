const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('./print-formats.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/',              ctrl.list);
router.post('/',             ctrl.create);
router.get('/:id',           ctrl.getOne);
router.put('/:id',           ctrl.update);
router.delete('/:id',        ctrl.remove);
router.get('/:id/render/:recordId', ctrl.render);

module.exports = router;
