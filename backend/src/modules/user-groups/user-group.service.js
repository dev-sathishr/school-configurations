const userGroupRepo = require('./user-group.repository');
const { validate } = require('../../shared/helpers/validate.helper');

const GROUP_RULES = {
  name: { required: true, min: 3, max: 200, label: 'Name' },
  code: { required: true, min: 2, max: 100, label: 'Code' },
  description: { max: 500, label: 'Description' },
};

async function getAll(query) {
  return userGroupRepo.findAll(query);
}

async function getById(id) {
  const group = await userGroupRepo.findById(id);
  if (!group) return { error: 'notFound', message: 'User group not found' };

  const permissions = await userGroupRepo.getPermissions(id);
  return { data: { ...group, permissions } };
}

async function create(body, userId) {
  const errors = validate(body, GROUP_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks
  const nameExists = await userGroupRepo.checkUnique('name', body.name);
  if (nameExists) return { error: 'conflict', message: 'Group name already exists' };

  const codeExists = await userGroupRepo.checkUnique('code', body.code);
  if (codeExists) return { error: 'conflict', message: 'Group code already exists' };

  const group = await userGroupRepo.create(body, userId);
  return { data: group };
}

async function update(id, body, userId) {
  const current = await userGroupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'User group not found' };

  // Protect system groups from name/code changes
  if (current.is_system && (body.name || body.code)) {
    const nameChanged = body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase();
    const codeChanged = body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase();
    if (nameChanged || codeChanged) {
      return { error: 'badRequest', message: 'Cannot change name or code of a system group' };
    }
  }

  const merged = { ...current, ...body };
  const errors = validate(merged, GROUP_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  // Unique checks (exclude self)
  if (body.name && body.name.trim().toLowerCase() !== current.name?.toLowerCase()) {
    const exists = await userGroupRepo.checkUnique('name', body.name, id);
    if (exists) return { error: 'conflict', message: 'Group name already exists' };
  }
  if (body.code && body.code.trim().toLowerCase() !== current.code?.toLowerCase()) {
    const exists = await userGroupRepo.checkUnique('code', body.code, id);
    if (exists) return { error: 'conflict', message: 'Group code already exists' };
  }

  const group = await userGroupRepo.update(id, body, current, userId);
  return { data: group };
}

async function remove(id, userId) {
  const current = await userGroupRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'User group not found' };

  if (current.is_system) return { error: 'badRequest', message: 'Cannot delete a system group' };

  const hasUsers = await userGroupRepo.hasAssignedUsers(id);
  if (hasUsers) return { error: 'conflict', message: 'Cannot delete group with assigned users' };

  await userGroupRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }

  const hasSystem = await userGroupRepo.hasSystemGroups(ids);
  if (hasSystem) return { error: 'badRequest', message: 'Cannot delete system groups' };

  const hasUsers = await userGroupRepo.hasAssignedUsersMultiple(ids);
  if (hasUsers) return { error: 'conflict', message: 'Cannot delete groups with assigned users' };

  const deletedCount = await userGroupRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function getDropdown() {
  const data = await userGroupRepo.findAllActive();
  return { data };
}

async function getPermissions(id) {
  const group = await userGroupRepo.findById(id);
  if (!group) return { error: 'notFound', message: 'User group not found' };

  const permissions = await userGroupRepo.getPermissions(id);
  return { data: permissions };
}

async function setPermissions(id, permissions, userId) {
  const group = await userGroupRepo.findById(id);
  if (!group) return { error: 'notFound', message: 'User group not found' };

  if (!Array.isArray(permissions)) {
    return { error: 'badRequest', message: 'permissions must be an array' };
  }

  await userGroupRepo.setPermissions(id, permissions, userId);
  const updated = await userGroupRepo.getPermissions(id);
  return { data: updated };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown, getPermissions, setPermissions };
