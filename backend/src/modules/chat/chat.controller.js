const chatRepo = require('./chat.repository');
const res = require('../../shared/helpers/response.helper');
const sse = require('../../shared/services/sse.service');

function attachOnlineStatus(items, userIdKey) {
  return items.map(item => ({ ...item, is_online: sse.isUserOnline(item[userIdKey]) }));
}

async function getConversations(req, resp) {
  try {
    const conversations = await chatRepo.getConversations(req.user.id);
    const unread_total = await chatRepo.getTotalUnreadCount(req.user.id);
    return res.success(resp, { conversations: attachOnlineStatus(conversations, 'other_user_id'), unread_total });
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.error(resp);
  }
}

async function getMessages(req, resp) {
  try {
    const { conversationId } = req.params;

    const isMember = await chatRepo.isMember(conversationId, req.user.id);
    if (!isMember) return res.forbidden(resp, 'Not a member of this conversation');

    const messages = await chatRepo.getMessages(conversationId, 50, req.query.before);

    // Mark as read
    await chatRepo.markAsRead(conversationId, req.user.id);

    return res.success(resp, { messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.error(resp);
  }
}

async function sendMessage(req, resp) {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) return res.badRequest(resp, 'Message content is required');

    const isMember = await chatRepo.isMember(conversationId, req.user.id);
    if (!isMember) return res.forbidden(resp, 'Not a member of this conversation');

    const message = await chatRepo.createMessage(conversationId, req.user.id, content.trim());

    // Mark as read for sender
    await chatRepo.markAsRead(conversationId, req.user.id);

    // Push real-time message to other members via SSE
    const members = await chatRepo.getConversationMembers(conversationId);
    for (const memberId of members) {
      if (memberId !== req.user.id) {
        const unread_total = await chatRepo.getTotalUnreadCount(memberId);
        sse.sendToUser(memberId, 'chat_message', { message, conversation_id: conversationId, unread_total });
      }
    }

    return res.success(resp, { message });
  } catch (err) {
    console.error('Send message error:', err);
    return res.error(resp);
  }
}

async function startConversation(req, resp) {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.badRequest(resp, 'user_id is required');

    const conversationId = await chatRepo.findOrCreateDirectConversation(req.user.id, user_id);
    return res.success(resp, { conversation_id: conversationId });
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.error(resp);
  }
}

async function markAsRead(req, resp) {
  try {
    await chatRepo.markAsRead(req.params.conversationId, req.user.id);
    return res.success(resp, {});
  } catch (err) {
    console.error('Mark as read error:', err);
    return res.error(resp);
  }
}

async function getUsers(req, resp) {
  try {
    const users = await chatRepo.getUsers(req.user.id);
    return res.success(resp, { users: attachOnlineStatus(users, 'id') });
  } catch (err) {
    console.error('Get chat users error:', err);
    return res.error(resp);
  }
}

async function getUnreadCount(req, resp) {
  try {
    const unread_total = await chatRepo.getTotalUnreadCount(req.user.id);
    return res.success(resp, { unread_total });
  } catch (err) {
    console.error('Get unread count error:', err);
    return res.error(resp);
  }
}

module.exports = { getConversations, getMessages, sendMessage, startConversation, markAsRead, getUsers, getUnreadCount };
