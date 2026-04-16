const groupRepo = require('./group.repository');
const db = require('../../config/database');
const notificationRepo = require('../notifications/notification.repository');
const requestRepo = require('../permission-requests/permission-request.repository');

async function getAll(query, viewOwnUserId) {
  return groupRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const group = await groupRepo.findByIdWithPermissions(id);
  if (!group) return { error: 'notFound', message: 'Group not found' };
  return { group };
}

async function getDropdown(query) {
  return groupRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await groupRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Group code already exists' };

  const group = await groupRepo.create(body, userId);
  return { group };
}

async function update(id, body, userId) {
  const current = await groupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await groupRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Group code already exists' };
  }

  const group = await groupRepo.update(id, body, current, userId);

  // Notify users with pending permission requests — only if group actually has module permissions in DB after update
  try {
    const permCount = await db.query(
      'SELECT COUNT(*) FROM settings.group_permissions WHERE group_id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (parseInt(permCount.rows[0].count) > 0) {
      const pendingUsers = await db.query(`
        SELECT pr.id AS request_id, pr.requested_by, u.full_name
        FROM settings.permission_requests pr
        JOIN settings.users u ON pr.requested_by = u.id
        WHERE u.group_id = $1 AND pr.status = 'pending'
      `, [id]);

      for (const row of pendingUsers.rows) {
        await requestRepo.updateStatus(row.request_id, 'approved', userId);
        await notificationRepo.create(
          row.requested_by,
          'permission_approved',
          'Access Granted',
          'Your permission request has been approved. You now have access to the assigned modules.',
          { approved_by: userId }
        );
      }
    }
  } catch (err) {
    console.error('Error notifying pending users:', err);
  }

  return { group };
}

async function remove(id, userId) {
  const current = await groupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group not found' };
  await groupRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await groupRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple };
