const db = require('../../config/database');

async function create(data, userId) {
  const result = await db.query(`
    INSERT INTO settings.files (entity_type, entity_id, file_type, original_name, stored_name, mime_type, size, path, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [
    data.entity_type, data.entity_id, data.file_type,
    data.original_name, data.stored_name, data.mime_type,
    data.size, data.path, userId,
  ]);
  return result.rows[0];
}

async function findById(id) {
  const result = await db.query(
    'SELECT * FROM settings.files WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
}

async function findByEntity(entityType, entityId, fileType) {
  let query = 'SELECT * FROM settings.files WHERE entity_type = $1 AND entity_id = $2 AND deleted_at IS NULL';
  const params = [entityType, entityId];

  if (fileType) {
    params.push(fileType);
    query += ` AND file_type = $${params.length}`;
  }

  query += ' ORDER BY created_at DESC';
  const result = await db.query(query, params);
  return result.rows;
}

async function findOneByEntity(entityType, entityId, fileType) {
  const files = await findByEntity(entityType, entityId, fileType);
  return files[0] || null;
}

async function softDelete(id, userId) {
  await db.query(
    'UPDATE settings.files SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
    [userId, id]
  );
}

// Soft delete all files for an entity+fileType (used when replacing a logo/profile image)
async function softDeleteByEntity(entityType, entityId, fileType, userId) {
  await db.query(
    'UPDATE settings.files SET deleted_at = NOW(), deleted_by = $1 WHERE entity_type = $2 AND entity_id = $3 AND file_type = $4 AND deleted_at IS NULL',
    [userId, entityType, entityId, fileType]
  );
}

module.exports = { create, findById, findByEntity, findOneByEntity, softDelete, softDeleteByEntity };
