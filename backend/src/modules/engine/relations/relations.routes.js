const express = require('express');
const router = express.Router();
const { getRelations, saveRelations, getMatrixRelations } = require('./relations.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/:junctionTable/:parentId/matrix', getMatrixRelations);
router.get('/:junctionTable/:parentId', getRelations);
router.post('/:junctionTable/:parentId', saveRelations);

module.exports = router;
