const notificationRepo = require('./notification.repository');
const res = require('../../shared/helpers/response.helper');
const { wrap, asyncHandler } = require('../../shared/middleware/async-handler');
const { addConnection, removeConnection, broadcast, getOnlineUserIds } = require('../../shared/services/sse.service');

async function getMyNotifications(req, resp) {
  const notifications = await notificationRepo.findByUser(req.user.id);
  const unread_count = await notificationRepo.getUnreadCount(req.user.id);
  return res.success(resp, { notifications, unread_count });
}

async function getUnreadCount(req, resp) {
  const unread_count = await notificationRepo.getUnreadCount(req.user.id);
  return res.success(resp, { unread_count });
}

async function markAsRead(req, resp) {
  await notificationRepo.markAsRead(req.params.id, req.user.id);
  return res.success(resp, {}, 'Notification marked as read');
}

async function markAllAsRead(req, resp) {
  await notificationRepo.markAllAsRead(req.user.id);
  return res.success(resp, {}, 'All notifications marked as read');
}

// SSE stream — long-lived connection, writes events directly. asyncHandler
// still forwards unexpected errors to the global handler (e.g. if the initial
// DB read fails before we open the stream).
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

  // Register this connection — if user just came online, broadcast presence
  const cameOnline = addConnection(userId, resp);
  if (cameOnline) {
    broadcast('presence_change', { user_id: userId, is_online: true });
  }

  // Send the full online user list to the newly connected user
  resp.write(`event: presence_snapshot\ndata: ${JSON.stringify({ online_user_ids: getOnlineUserIds() })}\n\n`);

  // Keep alive every 30 seconds
  const keepAlive = setInterval(() => {
    resp.write(': keep-alive\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    const wentOffline = removeConnection(userId, resp);
    if (wentOffline) {
      broadcast('presence_change', { user_id: userId, is_online: false });
    }
  });
}

module.exports = {
  ...wrap({ getMyNotifications, getUnreadCount, markAsRead, markAllAsRead }),
  stream: asyncHandler(stream),
};
