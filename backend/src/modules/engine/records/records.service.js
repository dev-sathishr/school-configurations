const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const metaService = require('../meta/meta.service');
const recordsRepo = require('./records.repository');
const fileRepo = require('../../files/file.repository');
const password = require('../../../shared/helpers/password.helper');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');
const { generateNextCode, peekNextCode } = require('../../../shared/helpers/sequence.helper');
const workflowRepo = require('../workflow/workflow.repository');

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');

async function saveFiles(slug, recordId, fileFields, body, userId) {
  for (const f of fileFields) {
    const payload = body[f.field_name];
    if (!payload || !payload.file_data) continue;

    const ext = path.extname(payload.file_name || '') || '.bin';
    const storedName = `${uuidv4()}${ext}`;
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, storedName), Buffer.from(payload.file_data, 'base64'));

    const meta = f.select_options || {};
    const fileType = meta.fileType || 'document';

    // Replace existing file of same type for this record
    await fileRepo.softDeleteByEntity(slug, recordId, fileType, userId);
    await fileRepo.create({
      entity_type: slug,
      entity_id: recordId,
      file_type: fileType,
      original_name: payload.file_name || storedName,
      stored_name: storedName,
      mime_type: payload.mime_type || 'application/octet-stream',
      size: payload.size || 0,
      path: `uploads/${storedName}`,
    }, userId);
  }
}

async function loadFiles(slug, recordId, fileFields) {
  const result = {};
  for (const f of fileFields) {
    const meta = f.select_options || {};
    const fileType = meta.fileType || 'document';
    result[f.field_name] = await fileRepo.findOneByEntity(slug, recordId, fileType) || null;
  }
  return result;
}

async function getDoctype(slug) {
  const result = await metaService.getDoctypeBySlug(slug);
  if (result.error) return null;
  return result.data;
}

function activeFields(doc) {
  return (doc.fields || []).filter(f => f.is_active && !f.deleted_at);
}

const TEXT_LIKE = new Set(['text', 'email', 'url', 'textarea', 'password']);

function applyTransform(value, transform) {
  if (typeof value !== 'string' || !transform) return value;
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  if (transform === 'titlecase') return value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return value;
}

function validateAndTransform(fields, data, { skipRequired = false } = {}) {
  for (const f of fields) {
    if (['address', 'file', 'relation-widget', 'child-table', 'naming-series'].includes(f.field_type)) continue;
    if (['is_active', 'location_id', 'workflow_state'].includes(f.field_name)) continue;
    const v = f.validators || {};
    const val = data[f.field_name];
    const isEmpty = val === undefined || val === null || val === '';

    if (!skipRequired && v.required && isEmpty) {
      return { error: 'badRequest', message: `${f.field_label} is required` };
    }

    if (!isEmpty && TEXT_LIKE.has(f.field_type)) {
      const str = String(val);
      if (v.min != null && str.length < v.min) {
        return { error: 'badRequest', message: `${f.field_label} must be at least ${v.min} characters` };
      }
      if (v.max != null && str.length > v.max) {
        return { error: 'badRequest', message: `${f.field_label} must be at most ${v.max} characters` };
      }
      if (v.transform) {
        data[f.field_name] = applyTransform(str, v.transform);
      }
    }
  }
  return null;
}

async function listRecords(slug, query, userId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  let scope = null;
  if (doc.is_location_scoped) {
    const { getUserLocationScope } = require('../../../shared/helpers/location-scope.helper');
    scope = await getUserLocationScope(userId);
  }
  const result = await recordsRepo.findAll(doc, activeFields(doc), query, scope);
  return { data: result.data, pagination: result.pagination };
}

async function getRecord(slug, id) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  const record = await recordsRepo.findById(doc, id);
  if (!record) return { error: 'notFound', message: 'Record not found' };

  const fields = activeFields(doc);
  const addressFields = fields.filter(f => f.field_type === 'address');
  if (addressFields.length > 0) {
    record.addresses = await getAddresses(slug, id);
  }
  const fileFields = fields.filter(f => f.field_type === 'file');
  if (fileFields.length > 0) {
    Object.assign(record, await loadFiles(slug, id, fileFields));
  }

  return { data: record };
}

async function createRecord(slug, body, userId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };

  const fields = activeFields(doc);
  const data = { ...body };

  const err = validateAndTransform(fields, data);
  if (err) return err;

  // Auto-generate naming-series values before insert
  const namingSeriesFields = fields.filter(f => f.field_type === 'naming-series' && f.ref_doctype_slug);
  for (const f of namingSeriesFields) {
    const seqResult = await generateNextCode(f.ref_doctype_slug, data.location_id || null);
    if (seqResult.error) return seqResult;
    data[f.field_name] = seqResult.code;
  }

  for (const f of fields) {
    if (f.is_unique && data[f.field_name]) {
      const taken = await recordsRepo.checkUnique(doc, f.field_name, data[f.field_name]);
      if (taken) return { error: 'conflict', message: `${f.field_label} already exists` };
    }
    if (f.field_type === 'password' && data[f.field_name]) {
      data[f.field_name] = await password.hash(data[f.field_name]);
    }
  }

  // Auto-set initial workflow state if a workflow is configured
  const wf = await workflowRepo.findBySlug(slug);
  if (wf?.is_active) {
    const initialState = (wf.states || []).find(s => s.is_initial);
    if (initialState) data.workflow_state = initialState.name;
  }

  const id = await recordsRepo.create(doc, fields, data, userId);
  const record = await recordsRepo.findById(doc, id);

  const addressFields = fields.filter(f => f.field_type === 'address');
  for (const af of addressFields) {
    if (Array.isArray(body[af.field_name]) && body[af.field_name].length > 0) {
      await saveAddresses(slug, id, body[af.field_name], userId);
    }
  }
  if (addressFields.length > 0) {
    record.addresses = await getAddresses(slug, id);
  }

  const fileFields = fields.filter(f => f.field_type === 'file');
  if (fileFields.length > 0) {
    await saveFiles(slug, id, fileFields, body, userId);
    Object.assign(record, await loadFiles(slug, id, fileFields));
  }

  return { data: record };
}

async function updateRecord(slug, id, body, userId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };

  const existing = await recordsRepo.findById(doc, id);
  if (!existing) return { error: 'notFound', message: 'Record not found' };

  const fields = activeFields(doc);
  const data = { ...body };

  // Only validate fields that are present in the update payload
  const presentFields = fields.filter(f => data[f.field_name] !== undefined);
  const err = validateAndTransform(presentFields, data, { skipRequired: true });
  if (err) return err;

  for (const f of fields) {
    if (f.is_unique && data[f.field_name] !== undefined && data[f.field_name] !== '') {
      const taken = await recordsRepo.checkUnique(doc, f.field_name, data[f.field_name], id);
      if (taken) return { error: 'conflict', message: `${f.field_label} already exists` };
    }
    if (f.field_type === 'password') {
      if (!data[f.field_name]) {
        delete data[f.field_name];
      } else {
        data[f.field_name] = await password.hash(data[f.field_name]);
      }
    }
  }

  await recordsRepo.update(doc, id, fields, data, userId);
  const record = await recordsRepo.findById(doc, id);

  const addressFields = fields.filter(f => f.field_type === 'address');
  for (const af of addressFields) {
    if (Array.isArray(body[af.field_name])) {
      await saveAddresses(slug, id, body[af.field_name], userId);
    }
  }
  if (addressFields.length > 0) {
    record.addresses = await getAddresses(slug, id);
  }

  const fileFields = fields.filter(f => f.field_type === 'file');
  if (fileFields.length > 0) {
    await saveFiles(slug, id, fileFields, body, userId);
    Object.assign(record, await loadFiles(slug, id, fileFields));
  }

  return { data: record };
}

async function deleteRecord(slug, id, userId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  const existing = await recordsRepo.findById(doc, id);
  if (!existing) return { error: 'notFound', message: 'Record not found' };
  await recordsRepo.softDelete(doc, id, userId);
  return { data: null };
}

async function deleteMultiple(slug, ids, userId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  await recordsRepo.softDeleteMultiple(doc, ids, userId);
  return { data: null };
}

async function checkUnique(slug, field, value, excludeId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  const taken = await recordsRepo.checkUnique(doc, field, value, excludeId);
  return { data: { available: !taken } };
}

async function previewNamingSeries(slug, fieldName, locationId) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };
  const field = activeFields(doc).find(f => f.field_name === fieldName && f.field_type === 'naming-series');
  if (!field) return { error: 'notFound', message: `Naming-series field "${fieldName}" not found` };
  const preview = await peekNextCode(field.ref_doctype_slug, locationId || null);
  return { data: { preview: preview || 'Not configured' } };
}

async function getDropdown(slug, query) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };

  // Use first text/email field that is searchable as label
  const fields = activeFields(doc);
  const labelField = fields.find(f => ['text', 'email'].includes(f.field_type) && f.is_searchable)
    || fields[0];

  const result = await recordsRepo.getDropdown(doc, query, labelField?.field_name);
  return { data: result.data, pagination: result.pagination };
}

module.exports = {
  listRecords, getRecord, createRecord, updateRecord,
  deleteRecord, deleteMultiple, checkUnique, getDropdown, previewNamingSeries,
};
