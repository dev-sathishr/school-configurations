const db = require('../../config/database');

/**
 * Shared repository primitives. Table / column names are interpolated
 * directly into SQL — these must always be hard-coded by the caller, never
 * user input. Values are always parameterized ($1, $2, ...).
 */

async function softDelete({ table, id, userId }) {
  await db.query(
    `UPDATE ${table} SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
    [userId, id]
  );
}

/**
 * Batch soft-delete. Returns the number of rows actually affected.
 *
 * Optional `scopeColumn` + `scope` narrows the delete to rows whose
 * `scopeColumn` is in `scope` — used so a location-scoped user can only
 * delete records inside their own locations. Passing either without the other
 * is treated as "no scope".
 */
async function softDeleteMultiple({ table, ids, userId, scopeColumn, scope }) {
  if (!ids || ids.length === 0) return 0;

  const idPlaceholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  const params = [userId, ...ids];
  let sql = `UPDATE ${table} SET deleted_at = NOW(), deleted_by = $1
             WHERE id IN (${idPlaceholders}) AND deleted_at IS NULL`;

  if (scopeColumn && scope && scope.length > 0) {
    const scopePlaceholders = scope.map((_, i) => `$${params.length + i + 1}`).join(', ');
    sql += ` AND ${scopeColumn} IN (${scopePlaceholders})`;
    params.push(...scope);
  }

  sql += ' RETURNING id';
  const result = await db.query(sql, params);
  return result.rowCount;
}

/**
 * Case-insensitive uniqueness check. `extraConditions` lets a caller scope
 * the check (e.g. `{ organization_id }` to check uniqueness within an org).
 *
 *   const dupe = await checkUnique({
 *     table: 'settings.locations',
 *     field: 'code',
 *     value: body.code,
 *     excludeId,
 *     extraConditions: { organization_id: body.organization_id },
 *   });
 */
async function checkUnique({ table, field, value, excludeId, extraConditions = {} }) {
  if (value === undefined || value === null) return false;
  let query = `SELECT id FROM ${table} WHERE LOWER(${field}) = LOWER($1) AND deleted_at IS NULL`;
  const params = [String(value).trim()];

  for (const [col, val] of Object.entries(extraConditions)) {
    if (val === undefined || val === null) continue;
    params.push(val);
    query += ` AND ${col} = $${params.length}`;
  }

  if (excludeId) {
    params.push(excludeId);
    query += ` AND id != $${params.length}`;
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
}

module.exports = { softDelete, softDeleteMultiple, checkUnique };
