const db = require('../../../config/database');

const TABLE = 'engine.print_formats';

async function findBySlug(doctypeSlug) {
  const result = await db.query(
    `SELECT id, doctype_slug, name, html_template, is_default, is_active
     FROM ${TABLE}
     WHERE doctype_slug = $1 AND deleted_at IS NULL AND is_active = true
     ORDER BY is_default DESC, name ASC`,
    [doctypeSlug]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT id, doctype_slug, name, html_template, is_default, is_active
     FROM ${TABLE} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(data, userId) {
  if (data.is_default) {
    await db.query(
      `UPDATE ${TABLE} SET is_default = false WHERE doctype_slug = $1 AND deleted_at IS NULL`,
      [data.doctype_slug]
    );
  }
  const result = await db.query(
    `INSERT INTO ${TABLE} (doctype_slug, name, html_template, is_default, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, true, $5, $5) RETURNING id`,
    [data.doctype_slug, data.name, data.html_template || '', data.is_default ?? false, userId]
  );
  return result.rows[0].id;
}

async function update(id, data, userId) {
  if (data.is_default) {
    const pf = await findById(id);
    if (pf) {
      await db.query(
        `UPDATE ${TABLE} SET is_default = false WHERE doctype_slug = $1 AND id != $2 AND deleted_at IS NULL`,
        [pf.doctype_slug, id]
      );
    }
  }
  await db.query(
    `UPDATE ${TABLE} SET name=$1, html_template=$2, is_default=$3, updated_by=$4, updated_at=NOW()
     WHERE id=$5 AND deleted_at IS NULL`,
    [data.name, data.html_template || '', data.is_default ?? false, userId, id]
  );
}

async function softDelete(id, userId) {
  await db.query(
    `UPDATE ${TABLE} SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2`,
    [userId, id]
  );
}

module.exports = { findBySlug, findById, create, update, softDelete };
