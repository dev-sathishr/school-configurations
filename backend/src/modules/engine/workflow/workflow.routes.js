const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('./workflow.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/',                           ctrl.getWorkflow);
router.post('/',                          ctrl.saveWorkflow);
router.delete('/',                        ctrl.deleteWorkflow);
router.get('/:recordId/actions',          ctrl.getActions);
router.post('/:recordId/transition',      ctrl.doTransition);

module.exports = router;
