const db = require('../../../config/database');

/**
 * Child records live in the same engine schema table as the child DocType,
 * but are scoped to a parent via (parent_doctype, parent_id).
 *
 * Every child table has two extra system columns added at DDL time:
 *   parent_doctype  TEXT
 *   parent_id       UUID
 *   row_order       INTEGER  (display order within the parent)
 *
 * All column/table names come from validated DocType metadata — never user input.
 * All values are parameterised.
 */

function tableName(slug, schema = 'engine') {
  return `"${schema}"."${slug}"`;
}

async function ensureChildColumns(slug, schema = 'engine') {
  const table = tableName(slug, schema);
  const cols = [
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS parent_doctype TEXT`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS parent_id UUID`,
    `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS row_order INTEGER DEFAULT 0`,
  ];
  for (const sql of cols) {
    await db.query(sql).catch(() => {});
  }
  await db.query(
    `CREATE INDEX IF NOT EXISTS "idx_${slug}_parent"
     ON ${table} (parent_doctype, parent_id)
     WHERE deleted_at IS NULL`
  ).catch(() => {});
}

async function findByParent(childSlug, parentDoctype, parentId, schema = 'engine') {
  const table = tableName(childSlug, schema);
  const res = await db.query(
    `SELECT * FROM ${table}
     WHERE parent_doctype = $1 AND parent_id = $2 AND deleted_at IS NULL
     ORDER BY row_order ASC, created_at ASC`,
    [parentDoctype, parentId]
  );
  return res.rows;
}

async function findChildById(childSlug, id, schema = 'engine') {
  const res = await db.query(
    `SELECT * FROM ${tableName(childSlug, schema)} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return res.rows[0] || null;
}

async function createChild(childSlug, fields, data, parentDoctype, parentId, rowOrder, userId, schema = 'engine') {
  const table = tableName(childSlug, schema);
  const cols = ['parent_doctype', 'parent_id', 'row_order', 'created_by', 'updated_by'];
  const vals = [parentDoctype, parentId, rowOrder, userId, userId];

  for (const f of fields) {
    if (['address', 'file', 'relation-widget', 'child-table'].includes(f.field_type)) continue;
    if (f.field_name === 'is_active') continue;
    if (f.field_type === 'phone') {
      cols.push(`"${f.field_name}_code"`, `"${f.field_name}"`);
      vals.push(data[`${f.field_name}_code`] || '+91', data[f.field_name] ?? null);
    } else if (data[f.field_name] !== undefined) {
      cols.push(`"${f.field_name}"`);
      vals.push(coerce(f, data[f.field_name]));
    }
  }

  if (data.is_active !== undefined) {
    cols.push('is_active');
    vals.push(data.is_active !== false);
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const res = await db.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    vals
  );
  return res.rows[0].id;
}

async function updateChild(childSlug, id, fields, data, userId, schema = 'engine') {
  const table = tableName(childSlug, schema);
  const sets = ['updated_by = $1', 'updated_at = NOW()'];
  const vals = [userId];

  for (const f of fields) {
    if (['address', 'file', 'relation-widget', 'child-table'].includes(f.field_type)) continue;
    if (f.field_name === 'is_active') continue;
    if (f.field_type === 'phone') {
      if (data[`${f.field_name}_code`] !== undefined) {
        vals.push(data[`${f.field_name}_code`] || '+91');
        sets.push(`"${f.field_name}_code" = $${vals.length}`);
      }
      if (data[f.field_name] !== undefined) {
        vals.push(data[f.field_name] ?? null);
        sets.push(`"${f.field_name}" = $${vals.length}`);
      }
    } else if (data[f.field_name] !== undefined) {
      vals.push(coerce(f, data[f.field_name]));
      sets.push(`"${f.field_name}" = $${vals.length}`);
    }
  }

  if (data.row_order !== undefined) {
    vals.push(data.row_order);
    sets.push(`row_order = $${vals.length}`);
  }
  if (data.is_active !== undefined) {
    vals.push(data.is_active !== false);
    sets.push(`is_active = $${vals.length}`);
  }

  vals.push(id);
  await db.query(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${vals.length} AND deleted_at IS NULL`,
    vals
  );
}

async function softDeleteChild(childSlug, id, userId, schema = 'engine') {
  await db.query(
    `UPDATE ${tableName(childSlug, schema)} SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
    [userId, id]
  );
}

async function softDeleteByParent(childSlug, parentDoctype, parentId, userId, schema = 'engine') {
  await db.query(
    `UPDATE ${tableName(childSlug, schema)}
     SET deleted_at = NOW(), deleted_by = $1
     WHERE parent_doctype = $2 AND parent_id = $3 AND deleted_at IS NULL`,
    [userId, parentDoctype, parentId]
  );
}

// Bulk replace: delete existing rows, re-insert all rows from payload (used for full child table save)
async function replaceChildren(childSlug, fields, rows, parentDoctype, parentId, userId, schema = 'engine') {
  await softDeleteByParent(childSlug, parentDoctype, parentId, userId, schema);
  const ids = [];
  for (let i = 0; i < rows.length; i++) {
    const id = await createChild(childSlug, fields, rows[i], parentDoctype, parentId, i, userId, schema);
    ids.push(id);
  }
  return ids;
}

function coerce(field, val) {
  if (val === '' || val === undefined) return null;
  if (field.field_type === 'checkbox') return val === true || val === 'true';
  if (field.field_type === 'number') return val === null ? null : Number(val);
  return val;
}

module.exports = {
  ensureChildColumns,
  findByParent,
  findChildById,
  createChild,
  updateChild,
  softDeleteChild,
  softDeleteByParent,
  replaceChildren,
};
