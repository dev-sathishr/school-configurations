const express = require('express');
const router = express.Router();
const { login, refresh, me, myPermissions, logout } = require('./auth.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.get('/me/permissions', authenticate, myPermissions);

module.exports = router;
