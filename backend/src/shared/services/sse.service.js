// SSE connection manager — tracks active connections per user
const connections = new Map(); // userId -> Set of response objects

function addConnection(userId, res) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId).add(res);
}

function removeConnection(userId, res) {
  const userConns = connections.get(userId);
  if (userConns) {
    userConns.delete(res);
    if (userConns.size === 0) {
      connections.delete(userId);
    }
  }
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

module.exports = { addConnection, removeConnection, sendToUser, sendToUsers };
