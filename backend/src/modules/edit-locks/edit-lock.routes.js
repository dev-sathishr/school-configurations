const express = require('express');
const { acquire, release } = require('./edit-lock.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.post('/acquire', acquire);
router.post('/release', release);

module.exports = router;

