const notificationRepo = require('./notification.repository');
const res = require('../../shared/helpers/response.helper');
const { addConnection, removeConnection } = require('../../shared/services/sse.service');

async function getMyNotifications(req, resp) {
  try {
    const notifications = await notificationRepo.findByUser(req.user.id);
    const unread_count = await notificationRepo.getUnreadCount(req.user.id);
    return res.success(resp, { notifications, unread_count });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.error(resp);
  }
}

async function getUnreadCount(req, resp) {
  try {
    const unread_count = await notificationRepo.getUnreadCount(req.user.id);
    return res.success(resp, { unread_count });
  } catch (err) {
    console.error('Get unread count error:', err);
    return res.error(resp);
  }
}

async function markAsRead(req, resp) {
  try {
    await notificationRepo.markAsRead(req.params.id, req.user.id);
    return res.success(resp, {}, 'Notification marked as read');
  } catch (err) {
    console.error('Mark as read error:', err);
    return res.error(resp);
  }
}

async function markAllAsRead(req, resp) {
  try {
    await notificationRepo.markAllAsRead(req.user.id);
    return res.success(resp, {}, 'All notifications marked as read');
  } catch (err) {
    console.error('Mark all as read error:', err);
    return res.error(resp);
  }
}

async function stream(req, resp) {
  const userId = req.user.id;

  resp.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send initial unread count
  const unread_count = await notificationRepo.getUnreadCount(userId);
  resp.write(`event: unread_count\ndata: ${JSON.stringify({ unread_count })}\n\n`);

  // Register this connection
  addConnection(userId, resp);

  // Keep alive every 30 seconds
  const keepAlive = setInterval(() => {
    resp.write(': keep-alive\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    removeConnection(userId, resp);
  });
}

module.exports = { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, stream };
