const repo = require('./print-formats.repository');
const recordsService = require('../records/records.service');

async function listFormats(doctypeSlug) {
  const formats = await repo.findBySlug(doctypeSlug);
  return { data: formats };
}

async function getFormat(id) {
  const pf = await repo.findById(id);
  if (!pf) return { error: 'notFound', message: 'Print format not found' };
  return { data: pf };
}

async function createFormat(body, userId) {
  if (!body.doctype_slug) return { error: 'badRequest', message: 'doctype_slug is required' };
  if (!body.name || String(body.name).trim().length < 2)
    return { error: 'badRequest', message: 'Name must be at least 2 characters' };
  const id = await repo.create(body, userId);
  const pf = await repo.findById(id);
  return { data: pf };
}

async function updateFormat(id, body, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Print format not found' };
  if (!body.name || String(body.name).trim().length < 2)
    return { error: 'badRequest', message: 'Name must be at least 2 characters' };
  await repo.update(id, body, userId);
  const pf = await repo.findById(id);
  return { data: pf };
}

async function deleteFormat(id, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Print format not found' };
  await repo.softDelete(id, userId);
  return { data: null };
}

// Render: inject record data into the HTML template
// Template variables: {{ doc.field_name }}, {{ doc.field_name | upper }}, etc.
async function renderFormat(id, recordId) {
  const pf = await repo.findById(id);
  if (!pf) return { error: 'notFound', message: 'Print format not found' };

  const recordResult = await recordsService.getRecord(pf.doctype_slug, recordId);
  if (recordResult.error) return recordResult;

  const doc = recordResult.data;
  const html = renderTemplate(pf.html_template, doc);
  return { data: { html, format_name: pf.name, doctype_slug: pf.doctype_slug } };
}

function renderTemplate(template, doc) {
  // Replace {{ doc.field_name }} and {{ doc.field_name | filter }}
  return template.replace(/\{\{\s*doc\.([a-z0-9_]+)(?:\s*\|\s*(\w+))?\s*\}\}/gi, (_, field, filter) => {
    let val = doc[field];
    if (val === null || val === undefined) val = '';
    val = String(val);
    if (filter === 'upper') val = val.toUpperCase();
    if (filter === 'lower') val = val.toLowerCase();
    if (filter === 'date') {
      try { val = new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); } catch {}
    }
    return val;
  });
}

module.exports = { listFormats, getFormat, createFormat, updateFormat, deleteFormat, renderFormat };
