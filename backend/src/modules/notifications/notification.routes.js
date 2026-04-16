const express = require('express');
const router = express.Router();
const { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, stream } = require('./notification.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { verifyAccessToken } = require('../../shared/helpers/jwt.helper');

// SSE stream — uses token from query param (EventSource doesn't support headers)
router.get('/stream', (req, res, next) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: 'Token required' });
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}, stream);

router.use(authenticate);
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
