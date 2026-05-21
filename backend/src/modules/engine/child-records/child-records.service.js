const metaService = require('../meta/meta.service');
const childRepo = require('./child-records.repository');
const ddl = require('../ddl/ddl.runner');

const TEXT_LIKE = new Set(['text', 'email', 'url', 'textarea', 'password']);

function activeFields(doc) {
  return (doc.fields || []).filter(f => f.is_active && !f.deleted_at);
}

function validateRow(fields, data, { skipRequired = false } = {}) {
  for (const f of fields) {
    if (['address', 'file', 'relation-widget', 'child-table'].includes(f.field_type)) continue;
    if (f.field_name === 'is_active') continue;
    const v = f.validators || {};
    const val = data[f.field_name];
    const isEmpty = val === undefined || val === null || val === '';

    if (!skipRequired && v.required && isEmpty) {
      return { error: 'badRequest', message: `${f.field_label} is required` };
    }
    if (!isEmpty && TEXT_LIKE.has(f.field_type)) {
      const str = String(val);
      if (v.min != null && str.length < v.min)
        return { error: 'badRequest', message: `${f.field_label} must be at least ${v.min} characters` };
      if (v.max != null && str.length > v.max)
        return { error: 'badRequest', message: `${f.field_label} must be at most ${v.max} characters` };
    }
  }
  return null;
}

async function getChildDoctype(parentSlug, fieldName) {
  const parentResult = await metaService.getDoctypeBySlug(parentSlug);
  if (parentResult.error) return { error: 'notFound', message: `DocType "${parentSlug}" not found` };

  const parentDoc = parentResult.data;
  const childField = activeFields(parentDoc).find(
    f => f.field_type === 'child-table' && f.field_name === fieldName
  );
  if (!childField) return { error: 'notFound', message: `Child table field "${fieldName}" not found on "${parentSlug}"` };

  const childSlug = childField.ref_doctype_slug;
  if (!childSlug) return { error: 'badRequest', message: `Child table field "${fieldName}" has no ref_doctype_slug` };

  const childResult = await metaService.getDoctypeBySlug(childSlug);
  if (childResult.error) return { error: 'notFound', message: `Child DocType "${childSlug}" not found` };

  // Ensure child table has parent columns in DB
  await childRepo.ensureChildColumns(childSlug, childResult.data.schema_name || 'engine');

  return { childDoc: childResult.data, parentDoc };
}

// GET /engine/child-records/:parentSlug/:parentId/:fieldName
async function listChildren(parentSlug, parentId, fieldName) {
  const res = await getChildDoctype(parentSlug, fieldName);
  if (res.error) return res;
  const { childDoc } = res;
  const rows = await childRepo.findByParent(
    childDoc.slug, parentSlug, parentId, childDoc.schema_name || 'engine'
  );
  return { data: rows };
}

// POST /engine/child-records/:parentSlug/:parentId/:fieldName
async function createChild(parentSlug, parentId, fieldName, body, userId) {
  const res = await getChildDoctype(parentSlug, fieldName);
  if (res.error) return res;
  const { childDoc } = res;
  const fields = activeFields(childDoc);
  const schema = childDoc.schema_name || 'engine';

  const err = validateRow(fields, body);
  if (err) return err;

  const existingRows = await childRepo.findByParent(childDoc.slug, parentSlug, parentId, schema);
  const rowOrder = existingRows.length;

  const id = await childRepo.createChild(
    childDoc.slug, fields, body, parentSlug, parentId, rowOrder, userId, schema
  );
  const record = await childRepo.findChildById(childDoc.slug, id, schema);
  return { data: record };
}

// PUT /engine/child-records/:parentSlug/:parentId/:fieldName/:rowId
async function updateChild(parentSlug, parentId, fieldName, rowId, body, userId) {
  const res = await getChildDoctype(parentSlug, fieldName);
  if (res.error) return res;
  const { childDoc } = res;
  const fields = activeFields(childDoc);
  const schema = childDoc.schema_name || 'engine';

  const existing = await childRepo.findChildById(childDoc.slug, rowId, schema);
  if (!existing) return { error: 'notFound', message: 'Child row not found' };

  const err = validateRow(fields, body, { skipRequired: true });
  if (err) return err;

  await childRepo.updateChild(childDoc.slug, rowId, fields, body, userId, schema);
  const record = await childRepo.findChildById(childDoc.slug, rowId, schema);
  return { data: record };
}

// DELETE /engine/child-records/:parentSlug/:parentId/:fieldName/:rowId
async function deleteChild(parentSlug, parentId, fieldName, rowId, userId) {
  const res = await getChildDoctype(parentSlug, fieldName);
  if (res.error) return res;
  const { childDoc } = res;
  const schema = childDoc.schema_name || 'engine';

  const existing = await childRepo.findChildById(childDoc.slug, rowId, schema);
  if (!existing) return { error: 'notFound', message: 'Child row not found' };

  await childRepo.softDeleteChild(childDoc.slug, rowId, userId, schema);
  return { data: null };
}

// POST /engine/child-records/:parentSlug/:parentId/:fieldName/replace
// Full replace: send all rows, deletes old ones and inserts fresh (used on parent save)
async function replaceChildren(parentSlug, parentId, fieldName, rows, userId) {
  const res = await getChildDoctype(parentSlug, fieldName);
  if (res.error) return res;
  const { childDoc } = res;
  const fields = activeFields(childDoc);
  const schema = childDoc.schema_name || 'engine';

  if (!Array.isArray(rows)) return { error: 'badRequest', message: 'rows must be an array' };

  for (let i = 0; i < rows.length; i++) {
    const err = validateRow(fields, rows[i]);
    if (err) return { error: err.error, message: `Row ${i + 1}: ${err.message}` };
  }

  await childRepo.replaceChildren(childDoc.slug, fields, rows, parentSlug, parentId, userId, schema);

  const saved = await childRepo.findByParent(childDoc.slug, parentSlug, parentId, schema);
  return { data: saved };
}

module.exports = { listChildren, createChild, updateChild, deleteChild, replaceChildren };
