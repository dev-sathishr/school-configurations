const express = require('express');
const router = express.Router();
const { createRequest, getPendingRequest } = require('./permission-request.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.post('/', createRequest);
router.get('/pending', getPendingRequest);

module.exports = router;
