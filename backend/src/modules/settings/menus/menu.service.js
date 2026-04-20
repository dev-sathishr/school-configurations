const menuRepo = require('./menu.repository');
const db = require('../../../config/database');
const { bulkImport, pick, asBool } = require('../../../shared/helpers/bulk-import.helper');

async function getAll(query, viewOwnUserId) {
  return menuRepo.findAll(query, viewOwnUserId);
}

async function getById(id) {
  const menu = await menuRepo.findByIdWithModules(id);
  if (!menu) return { error: 'notFound', message: 'Menu not found' };
  return { data: menu };
}

async function getDropdown(query) {
  return menuRepo.getDropdown(query);
}

async function getMenusWithModules() {
  const data = await menuRepo.getMenusWithModules();
  return { data };
}

async function create(body, userId) {
  const { name, code } = body;
  if (!name || !code) return { error: 'badRequest', message: 'Name and code are required' };

  const existing = await menuRepo.findByCodeActive(code);
  if (existing) return { error: 'conflict', message: 'Menu code already exists' };

  const menu = await menuRepo.create(body, userId);
  return { data: menu };
}

async function update(id, body, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };

  if (body.code && body.code.toLowerCase() !== current.code.toLowerCase()) {
    const duplicate = await menuRepo.findByCodeActive(body.code);
    if (duplicate) return { error: 'conflict', message: 'Menu code already exists' };
  }

  const menu = await menuRepo.update(id, body, current, userId);
  return { data: menu };
}

async function remove(id, userId) {
  const current = await menuRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu not found' };
  await menuRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await menuRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    preResolve: async (parsedRows) => {
      if (parsedRows.some((r) => !r.parent_id && (r.parent_code || r['Parent Code']))) {
        const result = await db.query('SELECT id, code FROM settings.menus WHERE deleted_at IS NULL');
        return { menuByCode: new Map(result.rows.map((m) => [String(m.code).toUpperCase(), m.id])) };
      }
      return {};
    },
    transformRow: async (raw, ctx) => {
      const row = {
        name: pick(raw, 'name', 'Name'),
        code: pick(raw, 'code', 'Code'),
        icon: pick(raw, 'icon', 'Icon') || '',
        route_path: pick(raw, 'route_path', 'Route Path') || '',
        display_order: Number(pick(raw, 'display_order', 'Display Order')) || 0,
        parent_id: pick(raw, 'parent_id', 'Parent ID') || null,
        description: pick(raw, 'description', 'Description') || '',
        is_active: asBool(pick(raw, 'is_active', 'Is Active'), true),
      };
      const parentCode = pick(raw, 'parent_code', 'Parent Code');
      if (!row.parent_id && parentCode && ctx.menuByCode) {
        row.parent_id = ctx.menuByCode.get(String(parentCode).toUpperCase()) || null;
        if (!row.parent_id) return { error: `Unknown parent_code: ${parentCode}` };
      }
      if (!row.name || !row.code) return { error: 'name and code are required' };
      return { row };
    },
  });
}

module.exports = { getAll, getById, getDropdown, getMenusWithModules, create, update, remove, removeMultiple, importRows };
