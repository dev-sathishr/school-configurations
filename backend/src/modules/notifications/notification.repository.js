const db = require('../../config/database');
const sse = require('../../shared/services/sse.service');

async function create(userId, type, title, message, data) {
  const result = await db.query(
    `INSERT INTO settings.notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, message || null, data ? JSON.stringify(data) : null]
  );
  const notification = result.rows[0];

  // Push real-time update to connected client
  const unread_count = await getUnreadCount(userId);
  sse.sendToUser(userId, 'notification', { notification, unread_count });

  return notification;
}

async function createForMultipleUsers(userIds, type, title, message, data) {
  const notifications = [];
  for (const userId of userIds) {
    const n = await create(userId, type, title, message, data);
    notifications.push(n);
  }
  return notifications;
}

async function findByUser(userId, limit = 20) {
  const result = await db.query(
    `SELECT * FROM settings.notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function getUnreadCount(userId) {
  const result = await db.query(
    `SELECT COUNT(*) FROM settings.notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

async function markAsRead(id, userId) {
  await db.query(
    `UPDATE settings.notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

async function markAllAsRead(userId) {
  await db.query(
    `UPDATE settings.notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
}

module.exports = { create, createForMultipleUsers, findByUser, getUnreadCount, markAsRead, markAllAsRead };
