const chatRepo = require('./chat.repository');
const res = require('../../shared/helpers/response.helper');
const { wrap } = require('../../shared/middleware/async-handler');
const sse = require('../../shared/services/sse.service');

function attachOnlineStatus(items, userIdKey) {
  return items.map(item => ({ ...item, is_online: sse.isUserOnline(item[userIdKey]) }));
}

async function getConversations(req, resp) {
  const conversations = await chatRepo.getConversations(req.user.id);
  const unread_total = await chatRepo.getTotalUnreadCount(req.user.id);
  return res.success(resp, { conversations: attachOnlineStatus(conversations, 'other_user_id'), unread_total });
}

async function getMessages(req, resp) {
  const { conversationId } = req.params;

  const isMember = await chatRepo.isMember(conversationId, req.user.id);
  if (!isMember) return res.forbidden(resp, 'Not a member of this conversation');

  const messages = await chatRepo.getMessages(conversationId, 50, req.query.before);

  // Mark as read
  await chatRepo.markAsRead(conversationId, req.user.id);

  return res.success(resp, { messages });
}

async function sendMessage(req, resp) {
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
}

async function startConversation(req, resp) {
  const { user_id } = req.body;
  if (!user_id) return res.badRequest(resp, 'user_id is required');

  const conversationId = await chatRepo.findOrCreateDirectConversation(req.user.id, user_id);
  return res.success(resp, { conversation_id: conversationId });
}

async function markAsRead(req, resp) {
  await chatRepo.markAsRead(req.params.conversationId, req.user.id);
  return res.success(resp, {});
}

async function getUsers(req, resp) {
  const users = await chatRepo.getUsers(req.user.id);
  return res.success(resp, { users: attachOnlineStatus(users, 'id') });
}

async function getUnreadCount(req, resp) {
  const unread_total = await chatRepo.getTotalUnreadCount(req.user.id);
  return res.success(resp, { unread_total });
}

async function typing(req, resp) {
  const { conversationId } = req.params;

  const isMember = await chatRepo.isMember(conversationId, req.user.id);
  if (!isMember) return res.forbidden(resp, 'Not a member of this conversation');

  const members = await chatRepo.getConversationMembers(conversationId);
  for (const memberId of members) {
    if (memberId !== req.user.id) {
      sse.sendToUser(memberId, 'typing', {
        conversation_id: conversationId,
        user_id: req.user.id,
        user_name: req.user.username,
      });
    }
  }

  return res.success(resp, {});
}

module.exports = wrap({ getConversations, getMessages, sendMessage, startConversation, markAsRead, getUsers, getUnreadCount, typing });
