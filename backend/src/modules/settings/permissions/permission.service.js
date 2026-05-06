const permissionRepo = require('./permission.repository');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query, viewOwnUserId) {
  return permissionRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const permission = await permissionRepo.findById(id);
  if (!permission) return { error: 'notFound', message: 'Permission not found' };
  return { data: permission };
}

async function getDropdown(query) {
  return permissionRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await permissionRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Permission code already exists' };

  const permission = await permissionRepo.create(body, userId);
  return getById(permission.id);
}

async function update(id, body, userId) {
  const current = await permissionRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Permission not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  // code is immutable after creation — ignore any value sent by the client
  body = { ...body, code: current.code };

  const permission = await permissionRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(permission);
  if (stale) return stale;

  return getById(id);
}

async function remove(id, userId) {
  const current = await permissionRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Permission not found' };
  if (current.group_permission_count > 0) {
    return { error: 'conflict', message: `Cannot delete "${current.name}" — it is assigned to ${current.group_permission_count} group(s). Remove the group assignments first.` };
  }
  await permissionRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const blocked = [];
  for (const id of ids) {
    const current = await permissionRepo.findById(id);
    if (current && current.group_permission_count > 0) blocked.push(`"${current.name}" (${current.group_permission_count} group(s))`);
  }
  if (blocked.length) return { error: 'conflict', message: `Cannot delete: ${blocked.join(', ')}. Remove their group assignments first.` };
  const deletedCount = await permissionRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    transformRow: async (raw) => {
      const row = {
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.name || !row.code) return { error: 'name and code are required' };
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
