const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'settings.menus';

const SELECT_FIELDS = `m.id, m.name, m.display_name, m.icon, m.route_path, m.display_order, m.is_active, m.description,
  m.parent_id, p.name AS parent_name,
  m.created_by, m.updated_by, m.created_at, m.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name,
  COALESCE(mc.module_count, 0) AS module_count`;

const JOINS = `LEFT JOIN settings.menus p ON m.parent_id = p.id
  LEFT JOIN settings.users cb ON m.created_by = cb.id
  LEFT JOIN settings.users ub ON m.updated_by = ub.id
  LEFT JOIN LATERAL (SELECT COUNT(*)::int AS module_count FROM settings.menu_modules mm WHERE mm.menu_id = m.id AND mm.deleted_at IS NULL) mc ON true`;

async function findAll(query, viewOwnUserId) {
  return paginate({
    table: 'settings.menus',
    alias: 'm',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['m.name', 'm.display_name', 'm.description'],
    filterableColumns: ['m.name', 'm.display_name', 'm.is_active'],
    sortableColumns: ['m.name', 'm.display_name', 'm.display_order', 'm.is_active', 'm.created_at', 'module_count'],
    defaultSortBy: 'm.display_order',
    defaultSortOrder: 'ASC',
    ...(viewOwnUserId ? { extraWhere: 'm.created_by = ?', extraWhereParams: [viewOwnUserId] } : {}),
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.menus m
    ${JOINS}
    WHERE m.id = $1 AND m.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByIdWithModules(id) {
  const menu = await findById(id);
  if (!menu) return null;

  const modules = await db.query(`
    SELECT mm.id AS menu_module_id, mm.module_id, mm.display_order,
      mod.name AS module_name, mod.display_name AS module_code
    FROM settings.menu_modules mm
    JOIN settings.modules mod ON mm.module_id = mod.id AND mod.deleted_at IS NULL
    WHERE mm.menu_id = $1 AND mm.deleted_at IS NULL
    ORDER BY mm.display_order ASC
  `, [id]);

  menu.modules = modules.rows;
  return menu;
}

async function findByDisplayNameActive(display_name) {
  const result = await db.query('SELECT * FROM settings.menus WHERE LOWER(display_name) = LOWER($1) AND deleted_at IS NULL', [display_name]);
  return result.rows[0] || null;
}

async function getDropdown(query) {
  return paginate({
    table: 'settings.menus',
    alias: 'm',
    selectFields: 'm.id, m.name',
    searchColumns: ['m.name'],
    filterableColumns: [],
    sortableColumns: ['m.name'],
    defaultSortBy: 'm.name',
    defaultSortOrder: 'ASC',
    extraWhere: "m.is_active = true",
  }, query);
}

async function getMenusWithModules() {
  const result = await db.query(`
    SELECT m.id AS menu_id, m.name AS menu_name, m.display_name AS menu_code, m.icon AS menu_icon, m.display_order AS menu_order,
      mm.module_id, mod.name AS module_name, mod.display_name AS module_code, mod.icon AS module_icon, mod.route_path AS module_route_path, mm.display_order AS module_order
    FROM settings.menus m
    LEFT JOIN settings.menu_modules mm ON m.id = mm.menu_id AND mm.deleted_at IS NULL
    LEFT JOIN settings.modules mod ON mm.module_id = mod.id AND mod.deleted_at IS NULL
    WHERE m.deleted_at IS NULL AND m.is_active = true
    ORDER BY m.display_order ASC, mm.display_order ASC
  `);

  const menuMap = new Map();
  for (const row of result.rows) {
    if (!menuMap.has(row.menu_id)) {
      menuMap.set(row.menu_id, {
        id: row.menu_id,
        name: row.menu_name,
        code: row.menu_code,
        icon: row.menu_icon,
        display_order: row.menu_order,
        modules: [],
      });
    }
    if (row.module_id) {
      menuMap.get(row.menu_id).modules.push({
        id: row.module_id,
        name: row.module_name,
        code: row.module_code,
        icon: row.module_icon,
        route_path: row.module_route_path,
        display_order: row.module_order,
      });
    }
  }

  return Array.from(menuMap.values());
}

async function create(data, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO settings.menus (name, display_name, icon, route_path, display_order, is_active, description, parent_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, display_name, icon, route_path, display_order, is_active, description, parent_id, created_at
    `, [
      data.name, data.display_name, data.icon || null, data.route_path || null,
      data.display_order || 0, data.is_active !== undefined ? data.is_active : true,
      data.description || null, data.parent_id || null, userId, userId,
    ]);
    const menu = result.rows[0];

    if (data.modules && Array.isArray(data.modules)) {
      await syncModules(client, menu.id, data.modules, userId);
    }

    await client.query('COMMIT');
    return await findByIdWithModules(menu.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function update(id, data, current, userId, expectedUpdatedAt) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE settings.menus SET
        name = $1, display_name = $2, icon = $3, route_path = $4, display_order = $5,
        is_active = $6, description = $7, parent_id = $8, updated_by = $9, updated_at = NOW()
      WHERE id = $10
        AND date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $11::timestamptz)
      RETURNING id, name, display_name, icon, route_path, display_order, is_active, description, parent_id, updated_at
    `, [
      data.name || current.name,
      data.display_name || current.display_name,
      data.icon !== undefined ? (data.icon || null) : current.icon,
      data.route_path !== undefined ? (data.route_path || null) : current.route_path,
      data.display_order !== undefined ? data.display_order : current.display_order,
      data.is_active !== undefined ? data.is_active : current.is_active,
      data.description !== undefined ? (data.description || null) : current.description,
      data.parent_id !== undefined ? (data.parent_id || null) : current.parent_id,
      userId, id, expectedUpdatedAt,
    ]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (data.modules && Array.isArray(data.modules)) {
      await syncModules(client, id, data.modules, userId);
    }

    await client.query('COMMIT');
    return await findByIdWithModules(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function syncModules(client, menuId, modules, userId) {
  await client.query(
    'UPDATE settings.menu_modules SET deleted_at = NOW(), deleted_by = $1 WHERE menu_id = $2 AND deleted_at IS NULL',
    [userId, menuId]
  );

  for (const mod of modules) {
    await client.query(
      'INSERT INTO settings.menu_modules (menu_id, module_id, display_order, created_by) VALUES ($1, $2, $3, $4)',
      [menuId, mod.module_id, mod.display_order || 0, userId]
    );
  }
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId });
}

module.exports = { findAll, findById, findByIdWithModules, findByDisplayNameActive, getDropdown, getMenusWithModules, create, update, softDelete, softDeleteMultiple };
