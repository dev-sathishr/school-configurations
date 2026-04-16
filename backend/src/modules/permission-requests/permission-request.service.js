const requestRepo = require('./permission-request.repository');
const notificationRepo = require('../notifications/notification.repository');
const userRepo = require('../users/user.repository');

async function createRequest(userId, message) {
  // Check if user already has a pending request
  const existing = await requestRepo.findPendingByUser(userId);
  if (existing) {
    return { error: 'conflict', message: 'You already have a pending permission request' };
  }

  const request = await requestRepo.create(userId, message);
  const user = await userRepo.findById(userId);

  // Notify all approvers (users with EDIT permission on GROUPS module)
  const approvers = await requestRepo.findApprovers();
  if (approvers.length > 0) {
    await notificationRepo.createForMultipleUsers(
      approvers.map(a => a.id),
      'permission_request',
      'Permission Request',
      `${user?.full_name || 'A user'} is requesting access permissions.${message ? ' Message: ' + message : ''}`,
      { request_id: request.id, requested_by: userId, user_name: user?.full_name }
    );
  }

  return { data: request };
}

async function getPendingRequest(userId) {
  const request = await requestRepo.findPendingByUser(userId);
  return { data: request };
}

module.exports = { createRequest, getPendingRequest };
