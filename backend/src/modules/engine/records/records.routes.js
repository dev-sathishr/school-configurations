const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('./records.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/dropdown',           ctrl.getDropdown);
router.get('/check-unique',            ctrl.checkUnique);
router.get('/naming-series-preview',   ctrl.previewNamingSeries);
router.get('/',                   ctrl.getAll);
router.post('/',                  ctrl.create);
router.delete('/delete-multiple', ctrl.removeMultiple);
router.get('/:id/fetch',          ctrl.fetchFields);
router.get('/:id',                ctrl.getById);
router.put('/:id',                ctrl.update);
router.delete('/:id',             ctrl.remove);

module.exports = router;
