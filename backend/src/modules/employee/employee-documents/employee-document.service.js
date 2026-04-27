const repo = require('./employee-document.repository');
const db = require('../../../config/database');

async function getAll(employeeId) {
  const rows = await repo.findAllByEmployee(employeeId);
  return { data: rows };
}

async function getById(id) {
  const row = await repo.findById(id);
  if (!row) return { error: 'notFound', message: 'Document record not found' };
  return { data: row };
}

async function validateDocumentType(document_type_id, document_no) {
  const dtResult = await db.query(
    `SELECT id, name, document_no_label, validation_pattern FROM settings.document_types WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [document_type_id]
  );
  if (!dtResult.rows.length) {
    return { error: 'badRequest', message: 'Selected document type is invalid or inactive' };
  }
  const dt = dtResult.rows[0];
  if (dt.validation_pattern && document_no) {
    try {
      const regex = new RegExp(dt.validation_pattern);
      if (!regex.test(document_no)) {
        const label = dt.document_no_label || 'Document Number';
        return { error: 'badRequest', message: `Invalid format for ${label}` };
      }
    } catch {
      // malformed regex in DB — skip validation
    }
  }
  return null;
}

async function create(employeeId, body, userId) {
  if (!body.document_type_id) {
    return { error: 'badRequest', message: 'Document type is required' };
  }

  const typeError = await validateDocumentType(body.document_type_id, body.document_no);
  if (typeError) return typeError;

  const row = await repo.create(employeeId, body, userId);
  return getById(row.id);
}

async function update(id, body, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Document record not found' };

  if (!body.document_type_id) {
    return { error: 'badRequest', message: 'Document type is required' };
  }

  const typeError = await validateDocumentType(body.document_type_id, body.document_no);
  if (typeError) return typeError;

  const row = await repo.update(id, body, userId);
  if (!row) return { error: 'notFound', message: 'Document record not found' };
  return getById(id);
}

async function remove(id, userId) {
  const existing = await repo.findById(id);
  if (!existing) return { error: 'notFound', message: 'Document record not found' };

  // Soft-delete any attached file
  await db.query(
    `UPDATE settings.files SET deleted_at=NOW(), deleted_by=$1
     WHERE entity_type='employee_document' AND entity_id=$2 AND deleted_at IS NULL`,
    [userId, id]
  );

  await repo.softDelete(id, userId);
  return {};
}

module.exports = { getAll, getById, create, update, remove };
