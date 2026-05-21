const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('./child-records.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

// GET    /engine/child-records/:parentSlug/:parentId/:fieldName
router.get('/:parentSlug/:parentId/:fieldName',           ctrl.getAll);

// POST   /engine/child-records/:parentSlug/:parentId/:fieldName
router.post('/:parentSlug/:parentId/:fieldName',          ctrl.create);

// POST   /engine/child-records/:parentSlug/:parentId/:fieldName/replace
router.post('/:parentSlug/:parentId/:fieldName/replace',  ctrl.replace);

// PUT    /engine/child-records/:parentSlug/:parentId/:fieldName/:rowId
router.put('/:parentSlug/:parentId/:fieldName/:rowId',    ctrl.update);

// DELETE /engine/child-records/:parentSlug/:parentId/:fieldName/:rowId
router.delete('/:parentSlug/:parentId/:fieldName/:rowId', ctrl.remove);

module.exports = router;
