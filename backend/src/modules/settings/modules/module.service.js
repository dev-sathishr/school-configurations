const moduleRepo = require('./module.repository');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query, viewOwnUserId) {
  return moduleRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const mod = await moduleRepo.findById(id);
  if (!mod) return { error: 'notFound', message: 'Module not found' };
  return { data: mod };
}

async function getDropdown(query) {
  return moduleRepo.getDropdown(query);
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await moduleRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Module code already exists' };

  const mod = await moduleRepo.create(body, userId);
  return { data: mod };
}

async function update(id, body, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await moduleRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Module code already exists' };
  }

  const mod = await moduleRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(mod);
  if (stale) return stale;

  return { data: mod };
}

async function remove(id, userId) {
  const current = await moduleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Module not found' };
  await moduleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await moduleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    transformRow: async (raw) => {
      const row = {
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        icon: pick(raw, 'icon', 'Icon') || '',
        route_path: pick(raw, 'route_path', 'Route Path') || '',
        display_order: Number(pick(raw, 'display_order', 'Display Order')) || 0,
        enforce_edit_lock: asBool(pick(raw, 'enforce_edit_lock', 'Enforce Edit Lock'), false),
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      if (!row.name || !row.code) return { error: 'name and code are required' };
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, create, update, remove, removeMultiple, importRows };
