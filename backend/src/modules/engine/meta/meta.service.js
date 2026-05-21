const { validate } = require('../../../shared/helpers/validate.helper');
const metaRepo = require('./meta.repository');
const metaCache = require('./meta.cache');
const ddl = require('../ddl/ddl.runner');
const db = require('../../../config/database');

const SLUG_PATTERN = /^[a-z][a-z0-9_-]{1,62}$/;

const VALID_FIELD_TYPES = new Set([
  'text', 'email', 'url', 'number', 'date',
  'select', 'async-select', 'textarea', 'checkbox', 'phone', 'password', 'file', 'address', 'relation-widget',
  'child-table', 'naming-series',
]);

const DOCTYPE_RULES = {
  label:        { required: true, min: 2, max: 128, label: 'Label' },
  plural_label: { required: true, min: 2, max: 128, label: 'Plural Label' },
};

function validateSlug(slug) {
  if (!slug) return 'Slug is required';
  if (!SLUG_PATTERN.test(slug)) return 'Slug must start with a letter and contain only lowercase letters, numbers, hyphens, or underscores (2–63 chars)';
  if (metaRepo.RESERVED_SLUGS.has(slug)) return `"${slug}" is a reserved word`;
  return null;
}

function validateFields(fields, displayMode) {
  if (displayMode === 'tab-group') return null; // tab-group has no own fields
  if (!Array.isArray(fields) || fields.length === 0) return 'At least one field is required';
  const names = new Set();
  for (const f of fields) {
    if (!f.field_name || !/^[a-z][a-z0-9_]{0,62}$/.test(f.field_name))
      return `Field name "${f.field_name || ''}" is invalid — use lowercase letters, numbers, underscores`;
    if (metaRepo.RESERVED_SLUGS.has(f.field_name))
      return `Field name "${f.field_name}" is reserved`;
    if (names.has(f.field_name)) return `Duplicate field name: "${f.field_name}"`;
    names.add(f.field_name);
    if (!f.field_label || String(f.field_label).trim().length < 1)
      return `Label is required for field "${f.field_name}"`;
    if (!VALID_FIELD_TYPES.has(f.field_type))
      return `Invalid field type "${f.field_type}" on field "${f.field_name}"`;
  }
  return null;
}

async function listDoctypes(query) {
  return { data: await metaRepo.listDoctypes(query) };
}

async function getDoctypeBySlug(slug) {
  const cached = metaCache.get(slug);
  if (cached) return { data: cached };
  const doc = await metaRepo.getDoctypeBySlug(slug);
  if (!doc) return { error: 'notFound', message: 'DocType not found' };
  metaCache.set(slug, doc);
  return { data: doc };
}

// Derive schema from the module route_path first segment (e.g. /master/x → master).
// Falls back to 'engine' so existing slugs without a module route keep working.
async function resolveSchema(slug) {
  const res = await db.query(
    `SELECT route_path FROM settings.modules WHERE route_path LIKE '%/' || $1 AND deleted_at IS NULL LIMIT 1`,
    [slug]
  );
  if (res.rows.length) {
    const segment = res.rows[0].route_path.split('/').filter(Boolean)[0];
    if (segment) return segment;
  }
  return 'engine';
}

async function ensureSchema(schemaName) {
  // Only allow safe schema names (alphanumeric + underscore)
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schemaName)) return;
  await db.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
}

async function createDoctype(body, userId) {
  const errors = validate(body, DOCTYPE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const slugError = validateSlug(body.slug);
  if (slugError) return { error: 'badRequest', message: slugError };

  const exists = await metaRepo.checkSlugExists(body.slug);
  if (exists) return { error: 'conflict', message: `A DocType with slug "${body.slug}" already exists` };

  const fieldsError = validateFields(body.fields, body.display_mode);
  if (fieldsError) return { error: 'badRequest', message: fieldsError };

  // Resolve target schema from the linked module's route_path
  const schemaName = body.schema_name || await resolveSchema(body.slug);
  await ensureSchema(schemaName);
  body = { ...body, schema_name: schemaName };

  const id = await metaRepo.createDoctype(body, userId);
  if (body.fields?.length) await metaRepo.upsertFields(id, body.fields, userId);

  const doc = await metaRepo.getDoctypeBySlug(body.slug);
  metaCache.set(body.slug, doc);

  // Auto DDL — skip for tab-group (no own table) and when auto_create_table is off
  if (body.auto_create_table !== false && body.display_mode !== 'tab-group') {
    const ddlResult = await ddl.ensureTable(doc);
    const status = ddlResult.ok ? 'active' : 'error';
    await db.query(
      `UPDATE engine.doctypes SET table_status = $1, last_error = $2 WHERE id = $3`,
      [status, ddlResult.error || null, id]
    );
    doc.table_status = status;
  }

  return { data: doc };
}

async function updateDoctype(slug, body, userId) {
  const doc = await metaRepo.getDoctypeBySlug(slug);
  if (!doc) return { error: 'notFound', message: 'DocType not found' };

  const errors = validate(body, DOCTYPE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.fields !== undefined) {
    const fieldsError = validateFields(body.fields, body.display_mode);
    if (fieldsError) return { error: 'badRequest', message: fieldsError };
  }

  await metaRepo.updateDoctype(doc.id, body, userId);
  if (body.fields?.length) await metaRepo.upsertFields(doc.id, body.fields, userId);

  metaCache.invalidate(slug);
  const updated = await metaRepo.getDoctypeBySlug(slug);
  metaCache.set(slug, updated);

  // Sync DDL — skip for tab-group (no own table)
  if (updated.auto_create_table && updated.display_mode !== 'tab-group') {
    const ddlResult = await ddl.ensureTable(updated);
    const status = ddlResult.ok ? 'active' : 'error';
    await db.query(
      `UPDATE engine.doctypes SET table_status = $1, last_error = $2 WHERE id = $3`,
      [status, ddlResult.error || null, updated.id]
    );
    updated.table_status = status;
  }

  return { data: updated };
}

async function softDeleteDoctype(slug, userId) {
  const doc = await metaRepo.getDoctypeBySlug(slug);
  if (!doc) return { error: 'notFound', message: 'DocType not found' };
  await metaRepo.softDeleteDoctype(doc.id, userId);
  metaCache.invalidate(slug);
  return { data: null };
}

async function upsertFields(slug, fields, userId) {
  const doc = await metaRepo.getDoctypeBySlug(slug);
  if (!doc) return { error: 'notFound', message: 'DocType not found' };

  const fieldsError = validateFields(fields);
  if (fieldsError) return { error: 'badRequest', message: fieldsError };

  await metaRepo.upsertFields(doc.id, fields, userId);
  metaCache.invalidate(slug);
  const updated = await metaRepo.getDoctypeBySlug(slug);
  metaCache.set(slug, updated);
  return { data: updated };
}

async function softDeleteField(slug, fieldId, userId) {
  const doc = await metaRepo.getDoctypeBySlug(slug);
  if (!doc) return { error: 'notFound', message: 'DocType not found' };
  await metaRepo.softDeleteField(fieldId, userId);
  metaCache.invalidate(slug);
  return { data: null };
}

async function getDropdown(query) {
  const rows = await metaRepo.getDropdown(query);
  return { data: rows };
}

module.exports = {
  listDoctypes, getDoctypeBySlug, createDoctype, updateDoctype,
  softDeleteDoctype, upsertFields, softDeleteField, getDropdown,
};
