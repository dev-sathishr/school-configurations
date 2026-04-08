const db = require('../../config/database');
const { paginate } = require('../../shared/helpers/pagination.helper');

const SELECT_FIELDS = `p.id, p.group_id, p.module_id, p.can_view, p.can_create, p.can_edit, p.can_delete,
  g.name AS group_name, g.code AS group_code,
  mod.name AS module_name, mod.code AS module_code,
  p.created_by, p.updated_by, p.created_at, p.updated_at,
  cb.full_name AS created_by_name, ub.full_name AS updated_by_name`;

const JOINS = `LEFT JOIN settings.groups g ON p.group_id = g.id
  LEFT JOIN settings.modules mod ON p.module_id = mod.id
  LEFT JOIN settings.users cb ON p.created_by = cb.id
  LEFT JOIN settings.users ub ON p.updated_by = ub.id`;

async function findAll(query) {
  return paginate({
    table: 'settings.permissions',
    alias: 'p',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['g.name', 'mod.name'],
    filterableColumns: ['p.group_id', 'p.module_id', 'p.can_view', 'p.can_create', 'p.can_edit', 'p.can_delete'],
    sortableColumns: ['g.name', 'mod.name', 'p.created_at'],
    defaultSortBy: 'p.created_at',
    defaultSortOrder: 'DESC',
  }, query);
}

async function findById(id) {
  const result = await db.query(`
    SELECT ${SELECT_FIELDS}
    FROM settings.permissions p
    ${JOINS}
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);
  return result.rows[0] || null;
}

async function findByGroupAndModule(groupId, moduleId) {
  const result = await db.query(
    'SELECT * FROM settings.permissions WHERE group_id = $1 AND module_id = $2 AND deleted_at IS NULL',
    [groupId, moduleId]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.permissions (group_id, module_id, can_view, can_create, can_edit, can_delete, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, group_id, module_id, can_view, can_create, can_edit, can_delete, created_at
  `, [
    data.group_id, data.module_id,
    data.can_view || false, data.can_create || false,
    data.can_edit || false, data.can_delete || false,
    userId, userId,
  ]);
  return result.rows[0];
}

async function update(id, data, current, userId) {
  const result = await db.query(`
    UPDATE settings.permissions SET
      group_id = $1, module_id = $2, can_view = $3, can_create = $4,
      can_edit = $5, can_delete = $6, updated_by = $7, updated_at = NOW()
    WHERE id = $8
    RETURNING id, group_id, module_id, can_view, can_create, can_edit, can_delete, updated_at
  `, [
    data.group_id || current.group_id,
    data.module_id || current.module_id,
    data.can_view !== undefined ? data.can_view : current.can_view,
    data.can_create !== undefined ? data.can_create : current.can_create,
    data.can_edit !== undefined ? data.can_edit : current.can_edit,
    data.can_delete !== undefined ? data.can_delete : current.can_delete,
    userId, id,
  ]);
  return result.rows[0];
}

async function softDelete(id, userId) {
  await db.query('UPDATE settings.permissions SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, id]);
}

async function softDeleteMultiple(ids, userId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const result = await db.query(
    `UPDATE settings.permissions SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
    [userId, ...ids]
  );
  return result.rowCount;
}

module.exports = { findAll, findById, findByGroupAndModule, create, update, softDelete, softDeleteMultiple };
