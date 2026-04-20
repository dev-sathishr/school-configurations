const express = require('express');
const router = express.Router();
const { getAll, getMine, getById, revoke, revokeOthers, logActivity } = require('./session.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

router.use(authenticate);

// Any authenticated user can view their own session history, log their own
// activity, and sign out their other devices. These don't need the SESSIONS
// module permission — they're strictly self-service.
router.get('/me', getMine);
router.post('/activity', logActivity);
router.post('/me/revoke-others', revokeOthers);

router.get('/', checkModuleView('SESSIONS'), getAll);
router.get('/:id', checkModuleView('SESSIONS'), getById);
router.post('/:id/revoke', authorizeModule('SESSIONS', 'DELETE'), revoke);

module.exports = router;
