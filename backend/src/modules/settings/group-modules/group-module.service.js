const groupModuleRepo = require('./group-module.repository');
const db = require('../../../config/database');
const { bulkImport, pick } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query) {
  return groupModuleRepo.findAll(query);
}

async function getById(id) {
  const groupModule = await groupModuleRepo.findById(id);
  if (!groupModule) return { error: 'notFound', message: 'Group Module mapping not found' };
  return { data: groupModule };
}

async function create(body, userId) {
  const { group_id, menu_id } = body;
  if (!group_id || !menu_id) return { error: 'badRequest', message: 'Group and Module are required' };

  const existing = await groupModuleRepo.findByGroupAndModule(group_id, menu_id);
  if (existing) return { error: 'conflict', message: 'This group is already linked to this module' };

  const groupModule = await groupModuleRepo.create(body, userId);
  return { data: groupModule };
}

async function update(id, body, userId) {
  const current = await groupModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group Module mapping not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const groupId = body.group_id || current.group_id;
  const moduleId = body.menu_id || current.menu_id;
  if (groupId !== current.group_id || moduleId !== current.menu_id) {
    const duplicate = await groupModuleRepo.findByGroupAndModule(groupId, moduleId);
    if (duplicate && duplicate.id !== id) return { error: 'conflict', message: 'This group is already linked to this module' };
  }

  const groupModule = await groupModuleRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(groupModule);
  if (stale) return stale;

  return { data: groupModule };
}

async function remove(id, userId) {
  const current = await groupModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Group Module mapping not found' };
  await groupModuleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await groupModuleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    preResolve: async () => {
      const [groups, menus] = await Promise.all([
        db.query('SELECT id, code FROM settings.groups WHERE deleted_at IS NULL'),
        db.query('SELECT id, code FROM settings.menus WHERE deleted_at IS NULL'),
      ]);
      return {
        groupByCode: new Map(groups.rows.map((g) => [String(g.code).toUpperCase(), g.id])),
        menuByCode: new Map(menus.rows.map((m) => [String(m.code).toUpperCase(), m.id])),
      };
    },
    transformRow: async (raw, ctx) => {
      let group_id = pick(raw, 'group_id', 'Group ID');
      let menu_id = pick(raw, 'menu_id', 'Menu ID');
      const groupCode = pick(raw, 'group_code', 'Group Code');
      const menuCode = pick(raw, 'menu_code', 'Menu Code');
      if (!group_id && groupCode) {
        group_id = ctx.groupByCode.get(String(groupCode).toUpperCase());
        if (!group_id) return { error: `Unknown group_code: ${groupCode}` };
      }
      if (!menu_id && menuCode) {
        menu_id = ctx.menuByCode.get(String(menuCode).toUpperCase());
        if (!menu_id) return { error: `Unknown menu_code: ${menuCode}` };
      }
      if (!group_id || !menu_id) {
        return { error: 'group_code/group_id and menu_code/menu_id are required' };
      }
      return { row: { group_id, menu_id } };
    },
  });
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, importRows };
