const db = require('../../config/database');

// Find or create a direct conversation between two users
async function findOrCreateDirectConversation(userId1, userId2) {
  // Check if conversation already exists
  const existing = await db.query(`
    SELECT c.id FROM settings.conversations c
    JOIN settings.conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
    JOIN settings.conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
    WHERE c.type = 'direct'
    LIMIT 1
  `, [userId1, userId2]);

  if (existing.rows.length > 0) return existing.rows[0].id;

  // Create new conversation
  const conv = await db.query(
    `INSERT INTO settings.conversations (type, created_by) VALUES ('direct', $1) RETURNING id`,
    [userId1]
  );
  const convId = conv.rows[0].id;

  await db.query(
    `INSERT INTO settings.conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [convId, userId1, userId2]
  );

  return convId;
}

// Get all conversations for a user with last message and unread count
async function getConversations(userId) {
  const result = await db.query(`
    SELECT c.id, c.type, c.created_at,
      u.id AS other_user_id, u.full_name AS other_user_name, u.username AS other_username,
      pf.id AS other_user_profile_file_id,
      lm.content AS last_message, lm.created_at AS last_message_at, lm.sender_id AS last_message_sender,
      (
        SELECT COUNT(*) FROM settings.messages m
        WHERE m.conversation_id = c.id AND m.created_at > cm.last_read_at AND m.sender_id != $1
      )::int AS unread_count
    FROM settings.conversation_members cm
    JOIN settings.conversations c ON cm.conversation_id = c.id
    JOIN settings.conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id != $1
    JOIN settings.users u ON cm2.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT f.id FROM settings.files f
      WHERE f.entity_type = 'user' AND f.entity_id = u.id AND f.file_type = 'profile_image' AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC LIMIT 1
    ) pf ON true
    LEFT JOIN LATERAL (
      SELECT content, created_at, sender_id FROM settings.messages
      WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    WHERE cm.user_id = $1 AND c.type = 'direct'
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
  `, [userId]);

  return result.rows;
}

// Get messages for a conversation (paginated)
async function getMessages(conversationId, limit = 50, before) {
  let query = `
    SELECT m.id, m.content, m.sender_id, m.created_at,
      u.full_name AS sender_name
    FROM settings.messages m
    JOIN settings.users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
  `;
  const params = [conversationId];

  if (before) {
    params.push(before);
    query += ` AND m.created_at < $${params.length}`;
  }

  params.push(limit);
  query += ` ORDER BY m.created_at DESC LIMIT $${params.length}`;

  const result = await db.query(query, params);
  return result.rows.reverse(); // Return oldest first
}

// Send a message
async function createMessage(conversationId, senderId, content) {
  const result = await db.query(
    `INSERT INTO settings.messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, senderId, content]
  );

  // Get sender name
  const sender = await db.query('SELECT full_name FROM settings.users WHERE id = $1', [senderId]);
  const message = result.rows[0];
  message.sender_name = sender.rows[0]?.full_name || '';

  return message;
}

// Mark conversation as read
async function markAsRead(conversationId, userId) {
  await db.query(
    `UPDATE settings.conversation_members SET last_read_at = NOW()
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

// Get members of a conversation
async function getConversationMembers(conversationId) {
  const result = await db.query(
    `SELECT user_id FROM settings.conversation_members WHERE conversation_id = $1`,
    [conversationId]
  );
  return result.rows.map(r => r.user_id);
}

// Check if user is member of conversation
async function isMember(conversationId, userId) {
  const result = await db.query(
    `SELECT 1 FROM settings.conversation_members WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
    [conversationId, userId]
  );
  return result.rows.length > 0;
}

// Get total unread count across all conversations
async function getTotalUnreadCount(userId) {
  const result = await db.query(`
    SELECT COALESCE(SUM(unread), 0)::int AS total FROM (
      SELECT (
        SELECT COUNT(*) FROM settings.messages m
        WHERE m.conversation_id = cm.conversation_id AND m.created_at > cm.last_read_at AND m.sender_id != $1
      ) AS unread
      FROM settings.conversation_members cm
      WHERE cm.user_id = $1
    ) sub
  `, [userId]);
  return parseInt(result.rows[0].total);
}

// Get all users (for starting new conversations)
async function getUsers(currentUserId) {
  const result = await db.query(
    `SELECT u.id, u.full_name, u.username, pf.id AS profile_file_id
     FROM settings.users u
     LEFT JOIN LATERAL (
       SELECT f.id FROM settings.files f
       WHERE f.entity_type = 'user' AND f.entity_id = u.id AND f.file_type = 'profile_image' AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC LIMIT 1
     ) pf ON true
     WHERE u.id != $1 AND u.is_active = true AND u.deleted_at IS NULL
     ORDER BY u.full_name ASC`,
    [currentUserId]
  );
  return result.rows;
}

module.exports = {
  findOrCreateDirectConversation, getConversations, getMessages,
  createMessage, markAsRead, getConversationMembers, isMember,
  getTotalUnreadCount, getUsers,
};
