// SSE connection manager — tracks active connections per user
const connections = new Map(); // userId -> Set of response objects

function addConnection(userId, res) {
  const wasOffline = !connections.has(userId);
  if (wasOffline) {
    connections.set(userId, new Set());
  }
  connections.get(userId).add(res);
  return wasOffline;
}

function removeConnection(userId, res) {
  const userConns = connections.get(userId);
  if (!userConns) return false;
  userConns.delete(res);
  if (userConns.size === 0) {
    connections.delete(userId);
    return true;
  }
  return false;
}

function sendToUser(userId, event, data) {
  const userConns = connections.get(userId);
  if (!userConns) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userConns) {
    res.write(message);
  }
}

function sendToUsers(userIds, event, data) {
  for (const userId of userIds) {
    sendToUser(userId, event, data);
  }
}

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const userConns of connections.values()) {
    for (const res of userConns) {
      res.write(message);
    }
  }
}

function isUserOnline(userId) {
  return connections.has(userId);
}

function getOnlineUserIds() {
  return Array.from(connections.keys());
}

module.exports = { addConnection, removeConnection, sendToUser, sendToUsers, broadcast, isUserOnline, getOnlineUserIds };
