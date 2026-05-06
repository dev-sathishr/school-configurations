const express = require('express');
const router = express.Router();
const {
  getAll, getMine, getById, getOnline,
  getMyAnalytics, getAdminAnalytics, getUserAnalyticsById,
  exportSessions, getRetention, setRetention, purge,
  revoke, revokeOwn, revokeOthers, logActivity, trackAction,
} = require('./session.controller');
const { authenticate, authorizeModule, checkModuleView } = require('../../../shared/middleware/auth.middleware');

// Export uses ?token= query param so the browser can navigate directly.
// Authenticate from query token before the main middleware chain.
router.get('/export', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, checkModuleView('SESSIONS'), exportSessions);

router.use(authenticate);

// Self-service — no SESSIONS module permission needed.
router.get('/me', getMine);
router.get('/me/analytics', getMyAnalytics);
router.post('/activity', logActivity);
router.post('/action', trackAction);
router.post('/me/revoke-others', revokeOthers);
router.post('/me/:id/revoke', revokeOwn);

// Admin-scoped endpoints.
router.get('/online', checkModuleView('SESSIONS'), getOnline);
router.get('/analytics', checkModuleView('SESSIONS'), getAdminAnalytics);
router.get('/retention', checkModuleView('SESSIONS'), getRetention);
router.put('/retention', authorizeModule('SESSIONS', 'EDIT'), setRetention);
router.post('/purge', authorizeModule('SESSIONS', 'DELETE'), purge);

router.get('/users/:userId/analytics', checkModuleView('SESSIONS'), getUserAnalyticsById);

router.get('/', checkModuleView('SESSIONS'), getAll);
router.get('/:id', checkModuleView('SESSIONS'), getById);
router.post('/:id/revoke', authorizeModule('SESSIONS', 'DELETE'), revoke);

module.exports = router;
