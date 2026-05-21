const recordsService = require('./records.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');
const db = require('../../../config/database');

async function getAll(req, resp) {
  const result = await recordsService.listRecords(req.params.slug, req.query, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data, pagination: result.pagination });
}

async function getById(req, resp) {
  const result = await recordsService.getRecord(req.params.slug, req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await recordsService.createRecord(req.params.slug, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Created successfully');
}

async function update(req, resp) {
  const result = await recordsService.updateRecord(req.params.slug, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Updated successfully');
}

async function remove(req, resp) {
  const result = await recordsService.deleteRecord(req.params.slug, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

async function removeMultiple(req, resp) {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length === 0)
    return res.handleError(resp, { error: 'badRequest', message: 'ids array is required' });
  const result = await recordsService.deleteMultiple(req.params.slug, ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

async function checkUnique(req, resp) {
  const { field, value, exclude_id } = req.query;
  if (!field || !value)
    return res.handleError(resp, { error: 'badRequest', message: 'field and value are required' });
  const result = await recordsService.checkUnique(req.params.slug, field, value, exclude_id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getDropdown(req, resp) {
  const result = await recordsService.getDropdown(req.params.slug, req.query);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data, pagination: result.pagination });
}

// GET /engine/records/sequence-code-options
// Returns all sequence codes with their configured location codes for the field-editor dropdown
async function sequenceCodeOptions(req, resp) {
  const result = await db.query(`
    SELECT sc.code, sc.name,
           STRING_AGG(l.code, ', ' ORDER BY l.code) AS location_codes
    FROM master.sequence_codes sc
    INNER JOIN master.sequence_controls ctrl
      ON ctrl.sequence_code_id = sc.id AND ctrl.deleted_at IS NULL AND ctrl.is_active = true
    INNER JOIN settings.locations l ON l.id = ctrl.location_id AND l.deleted_at IS NULL
    WHERE sc.deleted_at IS NULL AND sc.is_active = true
    GROUP BY sc.code, sc.name
    ORDER BY sc.code
  `);
  const data = result.rows.map(r => ({
    value: r.code,
    label: r.location_codes
      ? `${r.code} — ${r.name} [${r.location_codes}]`
      : `${r.code} — ${r.name}`,
  }));
  return res.success(resp, { data });
}

// GET /engine/records/:slug/naming-series-preview?field=doc_no&location_id=<uuid>
async function previewNamingSeries(req, resp) {
  const { field, location_id } = req.query;
  if (!field) return res.handleError(resp, { error: 'badRequest', message: 'field is required' });
  const result = await recordsService.previewNamingSeries(req.params.slug, field, location_id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

// GET /engine/records/:slug/:id/fetch?fields=name,code
// Returns only the requested fields from a linked record — used by fetch_from
async function fetchFields(req, resp) {
  const result = await recordsService.getRecord(req.params.slug, req.params.id);
  if (result.error) return res.handleError(resp, result);
  const requestedFields = (req.query.fields || '').split(',').map(s => s.trim()).filter(Boolean);
  const data = {};
  for (const field of requestedFields) {
    data[field] = result.data[field] ?? null;
  }
  return res.success(resp, { data });
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple, checkUnique, getDropdown, fetchFields, previewNamingSeries, sequenceCodeOptions });
