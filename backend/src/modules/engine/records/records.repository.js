const db = require('../../../config/database');

/**
 * All table/column names come from validated DocType metadata — never user input.
 * All values are parameterized.
 */

// Slugs that map to an existing static schema table
const TABLE_OVERRIDES = {
  users:             'settings.users',
  groups:            'settings.groups',
  locations:         'settings.locations',
  permissions:       'settings.permissions',
  menus:             'settings.menus',
  modules:           'settings.modules',
  organizations:     'settings.organizations',
  sequence_codes:    'master.sequence_codes',
  sequence_controls: 'master.sequence_controls',
};

// Accepts either a slug string (legacy / TABLE_OVERRIDES path) or a doctype
// object with schema_name for engine-managed tables.
function tableName(slugOrDoc, schema_name) {
  const slug = typeof slugOrDoc === 'object' ? slugOrDoc.slug : slugOrDoc;
  const schema = typeof slugOrDoc === 'object' ? (slugOrDoc.schema_name || 'engine') : (schema_name || 'engine');
  return TABLE_OVERRIDES[slug] || `"${schema}"."${slug}"`;
}

async function findAll(slugOrDoc, fields, query, scope = null) {
  const table = tableName(slugOrDoc);
  const slug = typeof slugOrDoc === 'object' ? slugOrDoc.slug : slugOrDoc;
  const isLocationScoped = typeof slugOrDoc === 'object' ? !!slugOrDoc.is_location_scoped : false;
  const alias = 't';

  const searchable = fields.filter(f => f.is_searchable && !f.is_hidden);
  const searchCols = searchable.map(f => `${alias}."${f.field_name}"`);
  const sortable = fields.filter(f => f.field_type !== 'address' && f.field_type !== 'file')
    .map(f => `${alias}."${f.field_name}"`);
  sortable.push(`${alias}.created_at`, `${alias}.is_active`);

  // Lateral joins for file fields — carry the file id per row
  const fileFields = fields.filter(f => f.field_type === 'file');
  const fileJoins = fileFields.map(f => {
    const meta = f.select_options || {};
    const fileType = meta.fileType || 'document';
    const alias2 = `_f_${f.field_name}`;
    return `LEFT JOIN LATERAL (SELECT id FROM settings.files WHERE entity_type = '${slug}' AND entity_id = ${alias}.id AND file_type = '${fileType}' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) ${alias2} ON true`;
  });
  const fileSelects = fileFields.map(f => `_f_${f.field_name}.id AS "${f.field_name}_file_id"`);

  // Lateral joins for async-select fields — carry the display name per row
  const asyncFields = fields.filter(f => f.field_type === 'async-select' && f.ref_doctype_slug);
  const asyncJoins = asyncFields.map(f => {
    const refTable = tableName(f.ref_doctype_slug);
    const alias2 = `_rel_${f.field_name}`;
    // Use try_cast via CASE to handle both TEXT and UUID column types safely
    return `LEFT JOIN LATERAL (SELECT name FROM ${refTable} WHERE ${alias}."${f.field_name}" IS NOT NULL AND id = (CASE WHEN ${alias}."${f.field_name}"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${alias}."${f.field_name}"::text::uuid ELSE NULL END) AND deleted_at IS NULL LIMIT 1) ${alias2} ON true`;
  });
  const asyncSelects = asyncFields.map(f => `_rel_${f.field_name}.name AS "${f.field_name}_name"`);

  const allExtraSelects = [...fileSelects, ...asyncSelects];
  const allExtraJoins = [...fileJoins, ...asyncJoins];
  const extraSelect = allExtraSelects.length > 0 ? ', ' + allExtraSelects.join(', ') : '';
  const extraJoins = allExtraJoins.length > 0 ? ' ' + allExtraJoins.join(' ') : '';

  // Location scope filtering
  const extraWhereClauses = [];
  const extraWhereParams = [];
  if (isLocationScoped) {
    const { applyLocationScope } = require('../../../shared/helpers/location-scope.helper');
    const loc = applyLocationScope({ column: `${alias}.location_id`, scope, requested: query.location_ids });
    if (loc.empty) {
      return { data: [], pagination: { page: 1, size: Number(query.size) || 10, total_count: 0, total_pages: 0 } };
    }
    if (loc.clause) {
      extraWhereClauses.push(loc.clause);
      extraWhereParams.push(...loc.params);
    }
  }

  const { paginate } = require('../../../shared/helpers/pagination.helper');
  return paginate({
    table,
    alias,
    selectFields: `${alias}.*, ub.full_name AS updated_by_name, cb.full_name AS created_by_name${extraSelect}`,
    joins: `LEFT JOIN settings.users ub ON ub.id = ${alias}.updated_by LEFT JOIN settings.users cb ON cb.id = ${alias}.created_by${extraJoins}`,
    searchColumns: searchCols,
    filterableColumns: fields.filter(f => f.is_filterable).map(f => `${alias}."${f.field_name}"`),
    sortableColumns: sortable,
    defaultSortBy: `${alias}.created_at`,
    defaultSortOrder: 'DESC',
    baseCondition: `${alias}.deleted_at IS NULL`,
    extraWhere: extraWhereClauses.join(' AND '),
    extraWhereParams,
  }, query);
}

async function findById(slugOrDoc, id) {
  const res = await db.query(
    `SELECT * FROM ${tableName(slugOrDoc)} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return res.rows[0] || null;
}

async function create(slugOrDoc, fields, data, userId) {
  const table = tableName(slugOrDoc);
  const slug = typeof slugOrDoc === 'object' ? slugOrDoc.slug : slugOrDoc;
  const cols = ['created_by', 'updated_by'];
  const vals = [userId, userId];

  for (const f of fields) {
    if (f.field_type === 'address' || f.field_type === 'file' || f.field_type === 'relation-widget') continue;
    // location_id and is_active are handled as system columns below
    if (f.field_name === 'location_id' || f.field_name === 'is_active') continue;
    if (f.field_type === 'phone') {
      cols.push(`"${f.field_name}_code"`, `"${f.field_name}"`);
      vals.push(data[`${f.field_name}_code`] || '+91', data[f.field_name] ?? null);
    } else if (data[f.field_name] !== undefined) {
      cols.push(`"${f.field_name}"`);
      vals.push(coerce(f, data[f.field_name]));
    }
  }

  if (data.location_id !== undefined) {
    cols.push('location_id');
    vals.push(data.location_id || null);
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

async function update(slugOrDoc, id, fields, data, userId) {
  const table = tableName(slugOrDoc);
  const sets = [`updated_by = $1`, `updated_at = NOW()`];
  const vals = [userId];

  for (const f of fields) {
    if (f.field_type === 'address' || f.field_type === 'file' || f.field_type === 'relation-widget') continue;
    // location_id and is_active are handled as system columns below
    if (f.field_name === 'location_id' || f.field_name === 'is_active') continue;
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

  if (data.location_id !== undefined) {
    vals.push(data.location_id || null);
    sets.push(`location_id = $${vals.length}`);
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

async function softDelete(slugOrDoc, id, userId) {
  await db.query(
    `UPDATE ${tableName(slugOrDoc)} SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
    [userId, id]
  );
}

async function softDeleteMultiple(slugOrDoc, ids, userId) {
  if (!ids?.length) return;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await db.query(
    `UPDATE ${tableName(slugOrDoc)} SET deleted_at = NOW(), deleted_by = $1
     WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [userId, ...ids]
  );
}

async function checkUnique(slugOrDoc, fieldName, value, excludeId) {
  const params = [String(value).toLowerCase()];
  let sql = `SELECT id FROM ${tableName(slugOrDoc)}
             WHERE LOWER("${fieldName}"::text) = $1 AND deleted_at IS NULL`;
  if (excludeId) { sql += ` AND id != $2`; params.push(excludeId); }
  const res = await db.query(sql, params);
  return res.rows.length > 0;
}

async function getDropdown(slugOrDoc, query, labelField) {
  const table = tableName(slugOrDoc);
  const label = labelField ? `"${labelField}"` : `id::text`;
  const search = query.search ? `%${query.search}%` : null;

  const page = Math.max(1, parseInt(query.page) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size) || 10));
  const offset = (page - 1) * size;

  const params = [];
  let where = `deleted_at IS NULL AND is_active = true`;
  if (search && labelField) {
    params.push(search);
    where += ` AND LOWER(${label}::text) LIKE LOWER($${params.length})`;
  }

  // total count
  const countRes = await db.query(
    `SELECT COUNT(*) FROM ${table} WHERE ${where}`,
    params
  );
  const total_count = parseInt(countRes.rows[0].count, 10);
  const total_pages = Math.max(1, Math.ceil(total_count / size));

  params.push(size, offset);
  const dataRes = await db.query(
    `SELECT id, id::text AS value, ${label} AS name FROM ${table}
     WHERE ${where}
     ORDER BY ${label}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: dataRes.rows,
    pagination: { page, size, total_count, total_pages },
  };
}

// Coerce JS value to the right type for PG
function coerce(field, val) {
  if (val === '' || val === undefined) return null;
  if (field.field_type === 'checkbox') return val === true || val === 'true';
  if (field.field_type === 'number') return val === null ? null : Number(val);
  return val;
}

module.exports = {
  findAll, findById, create, update, softDelete, softDeleteMultiple,
  checkUnique, getDropdown,
};
