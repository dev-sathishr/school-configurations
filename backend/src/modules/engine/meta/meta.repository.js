const db = require('../../../config/database');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const repoHelper = require('../../../shared/helpers/repo.helper');

const TABLE = 'engine.doctypes';
const FIELDS_TABLE = 'engine.doctype_fields';

const RESERVED_SLUGS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by', 'deleted_by',
]);

const SELECT_FIELDS = `
  d.id, d.slug, d.label, d.plural_label, d.icon, d.description,
  d.is_location_scoped, d.auto_create_table, d.table_status, d.last_error,
  d.schema_name, d.display_mode, d.modal_size, d.tab_children,
  d.meta_version, d.is_active, d.created_at, d.updated_at,
  u1.full_name AS created_by_name, u2.full_name AS updated_by_name
`;

const JOINS = `
  LEFT JOIN settings.users u1 ON u1.id = d.created_by
  LEFT JOIN settings.users u2 ON u2.id = d.updated_by
`;

async function listDoctypes(query) {
  return paginate({
    table: TABLE, alias: 'd',
    selectFields: SELECT_FIELDS,
    joins: JOINS,
    searchColumns: ['d.slug', 'd.label', 'd.plural_label'],
    filterableColumns: ['d.is_active', 'd.table_status', 'd.is_location_scoped'],
    sortableColumns: ['d.label', 'd.slug', 'd.created_at', 'd.updated_at', 'd.is_active'],
    defaultSortBy: 'd.label', defaultSortOrder: 'ASC',
    extraWhere: 'd.deleted_at IS NULL',
  }, query);
}

async function getDoctypeBySlug(slug) {
  const res = await db.query(
    `SELECT ${SELECT_FIELDS} FROM engine.doctypes d ${JOINS}
     WHERE d.slug = $1 AND d.deleted_at IS NULL`,
    [slug]
  );
  const doctype = res.rows[0];
  if (!doctype) return null;

  const fieldsRes = await db.query(
    `SELECT * FROM engine.doctype_fields
     WHERE doctype_id = $1 AND deleted_at IS NULL
     ORDER BY display_order ASC, id ASC`,
    [doctype.id]
  );
  doctype.fields = fieldsRes.rows;
  return doctype;
}

async function getDoctypeById(id) {
  const res = await db.query(
    `SELECT ${SELECT_FIELDS} FROM engine.doctypes d ${JOINS}
     WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [id]
  );
  return res.rows[0] || null;
}

async function checkSlugExists(slug, excludeId) {
  const params = [slug.toLowerCase()];
  let sql = `SELECT id FROM engine.doctypes WHERE LOWER(slug) = $1 AND deleted_at IS NULL`;
  if (excludeId) { sql += ` AND id != $2`; params.push(excludeId); }
  const res = await db.query(sql, params);
  return res.rows.length > 0;
}

async function createDoctype(data, userId) {
  const res = await db.query(
    `INSERT INTO engine.doctypes
       (slug, label, plural_label, icon, description, is_location_scoped, auto_create_table,
        is_active, schema_name, display_mode, modal_size, tab_children, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING id`,
    [
      data.slug, data.label, data.plural_label,
      data.icon || null, data.description || null,
      data.is_location_scoped ?? false,
      data.auto_create_table ?? true,
      data.is_active ?? true,
      data.schema_name || 'engine',
      data.display_mode || 'page',
      data.modal_size || 'medium',
      data.tab_children ? JSON.stringify(data.tab_children) : null,
      userId,
    ]
  );
  return res.rows[0].id;
}

async function updateDoctype(id, data, userId) {
  await db.query(
    `UPDATE engine.doctypes SET
       label = $1, plural_label = $2, icon = $3, description = $4,
       is_location_scoped = $5, auto_create_table = $6, is_active = $7,
       display_mode = $8, modal_size = $9, tab_children = $10,
       updated_by = $11, updated_at = NOW(), meta_version = meta_version + 1
     WHERE id = $12 AND deleted_at IS NULL`,
    [
      data.label, data.plural_label,
      data.icon || null, data.description || null,
      data.is_location_scoped ?? false,
      data.auto_create_table ?? true,
      data.is_active ?? true,
      data.display_mode || 'page',
      data.modal_size || 'medium',
      data.tab_children ? JSON.stringify(data.tab_children) : null,
      userId, id,
    ]
  );
}

async function softDeleteDoctype(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function upsertFields(doctypeId, fields, userId) {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    await db.query(
      `INSERT INTO engine.doctype_fields
         (doctype_id, field_name, field_label, field_type, display_order, col_span, section_name,
          validators, is_unique, is_searchable, is_filterable, is_readonly, is_hidden,
          show_in_list, help_text, select_options, ref_doctype_slug, default_value,
          fetch_from, depends_on, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22)
       ON CONFLICT (doctype_id, field_name) DO UPDATE SET
         field_label      = EXCLUDED.field_label,
         field_type       = EXCLUDED.field_type,
         display_order    = EXCLUDED.display_order,
         col_span         = EXCLUDED.col_span,
         section_name     = EXCLUDED.section_name,
         validators       = EXCLUDED.validators,
         is_unique        = EXCLUDED.is_unique,
         is_searchable    = EXCLUDED.is_searchable,
         is_filterable    = EXCLUDED.is_filterable,
         is_readonly      = EXCLUDED.is_readonly,
         is_hidden        = EXCLUDED.is_hidden,
         show_in_list     = EXCLUDED.show_in_list,
         help_text        = EXCLUDED.help_text,
         select_options   = EXCLUDED.select_options,
         ref_doctype_slug = EXCLUDED.ref_doctype_slug,
         default_value    = EXCLUDED.default_value,
         fetch_from       = EXCLUDED.fetch_from,
         depends_on       = EXCLUDED.depends_on,
         is_active        = EXCLUDED.is_active,
         updated_by       = EXCLUDED.updated_by,
         updated_at       = NOW(),
         deleted_at       = NULL,
         deleted_by       = NULL`,
      [
        doctypeId,
        f.field_name, f.field_label, f.field_type,
        f.display_order ?? i,
        f.col_span ?? 6,
        f.section_name || null,
        JSON.stringify(f.validators || {}),
        f.is_unique ?? false,
        f.is_searchable ?? true,
        f.is_filterable ?? false,
        f.is_readonly ?? false,
        f.is_hidden ?? false,
        f.show_in_list ?? true,
        f.help_text || null,
        f.select_options ? JSON.stringify(f.select_options) : null,
        f.ref_doctype_slug || null,
        f.default_value != null ? String(f.default_value) : null,
        f.fetch_from || null,
        f.depends_on || null,
        f.is_active ?? true,
        userId,
      ]
    );
  }
}

async function softDeleteField(fieldId, userId) {
  await db.query(
    `UPDATE engine.doctype_fields SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2`,
    [userId, fieldId]
  );
}

async function getDropdown(query) {
  const search = query.search ? `%${query.search}%` : null;
  const sql = search
    ? `SELECT id, slug AS value, label AS name FROM engine.doctypes
       WHERE deleted_at IS NULL AND is_active = true
         AND (LOWER(label) LIKE LOWER($1) OR LOWER(slug) LIKE LOWER($1))
       ORDER BY label LIMIT 50`
    : `SELECT id, slug AS value, label AS name FROM engine.doctypes
       WHERE deleted_at IS NULL AND is_active = true
       ORDER BY label LIMIT 50`;
  const res = await db.query(sql, search ? [search] : []);
  return res.rows;
}

module.exports = {
  RESERVED_SLUGS,
  listDoctypes, getDoctypeBySlug, getDoctypeById,
  checkSlugExists, createDoctype, updateDoctype, softDeleteDoctype,
  upsertFields, softDeleteField, getDropdown,
};
