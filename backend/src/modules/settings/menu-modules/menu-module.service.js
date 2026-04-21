const menuModuleRepo = require('./menu-module.repository');
const db = require('../../../config/database');
const { bulkImport, pick } = require('../../../shared/helpers/bulk-import.helper');
const { getExpectedUpdatedAt, toConflictIfStale } = require('../../../shared/helpers/optimistic-lock.helper');

async function getAll(query) {
  return menuModuleRepo.findAll(query);
}

async function getById(id) {
  const menuModule = await menuModuleRepo.findById(id);
  if (!menuModule) return { error: 'notFound', message: 'Menu Module mapping not found' };
  return { data: menuModule };
}

async function create(body, userId) {
  const { menu_id, module_id } = body;
  if (!menu_id || !module_id) return { error: 'badRequest', message: 'Menu and Module are required' };

  const existing = await menuModuleRepo.findByMenuAndModule(menu_id, module_id);
  if (existing) return { error: 'conflict', message: 'This menu is already linked to this module' };

  const menuModule = await menuModuleRepo.create(body, userId);
  return { data: menuModule };
}

async function update(id, body, userId) {
  const current = await menuModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu Module mapping not found' };

  const version = getExpectedUpdatedAt(body);
  if (version.error) return version;

  const menuId = body.menu_id || current.menu_id;
  const moduleId = body.module_id || current.module_id;
  if (menuId !== current.menu_id || moduleId !== current.module_id) {
    const duplicate = await menuModuleRepo.findByMenuAndModule(menuId, moduleId);
    if (duplicate && duplicate.id !== id) return { error: 'conflict', message: 'This menu is already linked to this module' };
  }

  const menuModule = await menuModuleRepo.update(id, body, current, userId, version.data);
  const stale = toConflictIfStale(menuModule);
  if (stale) return stale;

  return { data: menuModule };
}

async function remove(id, userId) {
  const current = await menuModuleRepo.findById(id);
  if (!current) return { error: 'notFound', message: 'Menu Module mapping not found' };
  await menuModuleRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const deletedCount = await menuModuleRepo.softDeleteMultiple(ids, userId);
  return { deleted_count: deletedCount };
}

async function importRows(rows, userId) {
  return bulkImport({
    rows, create, userId,
    preResolve: async () => {
      const [menus, mods] = await Promise.all([
        db.query('SELECT id, code FROM settings.menus WHERE deleted_at IS NULL'),
        db.query('SELECT id, code FROM settings.modules WHERE deleted_at IS NULL'),
      ]);
      return {
        menuByCode: new Map(menus.rows.map((m) => [String(m.code).toUpperCase(), m.id])),
        moduleByCode: new Map(mods.rows.map((m) => [String(m.code).toUpperCase(), m.id])),
      };
    },
    transformRow: async (raw, ctx) => {
      let menu_id = pick(raw, 'menu_id', 'Menu ID');
      let module_id = pick(raw, 'module_id', 'Module ID');
      const menuCode = pick(raw, 'menu_code', 'Menu Code');
      const moduleCode = pick(raw, 'module_code', 'Module Code');
      if (!menu_id && menuCode) {
        menu_id = ctx.menuByCode.get(String(menuCode).toUpperCase());
        if (!menu_id) return { error: `Unknown menu_code: ${menuCode}` };
      }
      if (!module_id && moduleCode) {
        module_id = ctx.moduleByCode.get(String(moduleCode).toUpperCase());
        if (!module_id) return { error: `Unknown module_code: ${moduleCode}` };
      }
      if (!menu_id || !module_id) {
        return { error: 'menu_code/menu_id and module_code/module_id are required' };
      }
      return { row: {
        menu_id, module_id,
        display_order: Number(pick(raw, 'display_order', 'Display Order')) || 0,
      } };
    },
  });
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, importRows };
