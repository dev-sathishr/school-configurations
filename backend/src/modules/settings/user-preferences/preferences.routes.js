const express = require('express');
const router = express.Router();
const { get, patch, track } = require('./preferences.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/', get);
router.patch('/', patch);
router.post('/track', track);

module.exports = router;
