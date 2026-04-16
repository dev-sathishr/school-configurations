const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, startConversation, markAsRead, getUsers, getUnreadCount } = require('./chat.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

router.use(authenticate);

router.get('/users', getUsers);
router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.post('/conversations', startConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.put('/conversations/:conversationId/read', markAsRead);

module.exports = router;
