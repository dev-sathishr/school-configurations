const db = require('../../db');
const { paginate } = require('../../shared/helpers/pagination.helper');
const res = require('../../shared/helpers/response.helper');
const { validate } = require('../../shared/helpers/validate.helper');
const { saveAddresses, getAddresses } = require('../../shared/helpers/address.helper');

const LOC_RULES = {
  organization_id: { required: true, label: 'Organization' },
  name: { required: true, min: 3, max: 100, label: 'Name' },
  code: { required: true, min: 3, max: 5, label: 'Code' },
  type: { required: true, label: 'Type' },
  email: { max: 100, email: true, label: 'Email' },
  primary_contact_no: { required: true, label: 'Primary Contact' },
  notes: { max: 500, label: 'Notes' },
};

async function getAll(req, resp) {
  try {
    const result = await paginate({
      table: 'settings.locations',
      alias: 'l',
      selectFields: `l.*, org.name AS organization_name, cb.full_name AS created_by_name, ub.full_name AS updated_by_name`,
      joins: `LEFT JOIN settings.organizations org ON l.organization_id = org.id
              LEFT JOIN settings.users cb ON l.created_by = cb.id
              LEFT JOIN settings.users ub ON l.updated_by = ub.id`,
      searchColumns: ['l.name', 'l.code', 'l.email', 'l.city', 'org.name'],
      filterableColumns: ['l.name', 'l.code', 'l.type', 'l.city', 'l.is_active', 'l.organization_id'],
      sortableColumns: ['l.name', 'l.code', 'l.type', 'l.city', 'l.is_active', 'l.created_at', 'org.name'],
      defaultSortBy: 'l.created_at',
      defaultSortOrder: 'DESC',
    }, req.query);

    return res.success(resp, result);
  } catch (err) {
    console.error('Get locations error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await db.query(`
      SELECT l.*, org.name AS organization_name, cb.full_name AS created_by_name, ub.full_name AS updated_by_name
      FROM settings.locations l
      LEFT JOIN settings.organizations org ON l.organization_id = org.id
      LEFT JOIN settings.users cb ON l.created_by = cb.id
      LEFT JOIN settings.users ub ON l.updated_by = ub.id
      WHERE l.id = $1 AND l.deleted_at IS NULL
    `, [req.params.id]);

    if (result.rows.length === 0) return res.notFound(resp, 'Location not found');
    const addresses = await getAddresses('location', req.params.id);
    return res.success(resp, { data: { ...result.rows[0], addresses } });
  } catch (err) {
    console.error('Get location error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const b = req.body;

    // Validate fields
    const errors = validate(b, LOC_RULES);
    if (!b.addresses || !Array.isArray(b.addresses) || b.addresses.length === 0) {
      errors.push('At least one address is required');
    }
    if (errors.length) return res.badRequest(resp, errors.join(', '));

    // Unique checks: code must be unique within the same organization
    if (b.code) {
      const dup = await db.query('SELECT id FROM settings.locations WHERE LOWER(code) = LOWER($1) AND organization_id = $2 AND deleted_at IS NULL', [b.code.trim(), b.organization_id]);
      if (dup.rows.length) return res.conflict(resp, 'Location code already exists in this organization');
    }
    if (b.email) {
      const dup = await db.query('SELECT id FROM settings.locations WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL', [b.email.trim()]);
      if (dup.rows.length) return res.conflict(resp, 'Email already exists');
    }

    const result = await db.query(`
      INSERT INTO settings.locations (organization_id, name, code, type, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, is_active, notes, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      b.organization_id, b.name, b.code||null, b.type||'branch', b.email||null,
      b.primary_contact_code||'+91', b.primary_contact_no||null,
      b.alternate_contact_code||'+91', b.alternate_contact_no||null,
      b.is_active!==undefined?b.is_active:true, b.notes||null, req.user.id, req.user.id
    ]);

    await saveAddresses('location', result.rows[0].id, b.addresses, req.user.id);

    return res.created(resp, { data: result.rows[0] }, 'Location created successfully');
  } catch (err) {
    console.error('Create location error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const existing = await db.query('SELECT * FROM settings.locations WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Location not found');

    const c = existing.rows[0];
    const b = req.body;

    // Validate fields
    const merged = { ...c, ...b };
    const errors = validate(merged, LOC_RULES);
    if (errors.length) return res.badRequest(resp, errors.join(', '));

    // Unique checks (exclude self)
    const orgId = b.organization_id || c.organization_id;
    if (b.code && b.code.trim().toLowerCase() !== c.code?.toLowerCase()) {
      const dup = await db.query('SELECT id FROM settings.locations WHERE LOWER(code) = LOWER($1) AND organization_id = $2 AND deleted_at IS NULL AND id != $3', [b.code.trim(), orgId, req.params.id]);
      if (dup.rows.length) return res.conflict(resp, 'Location code already exists in this organization');
    }
    if (b.email && b.email.trim().toLowerCase() !== c.email?.toLowerCase()) {
      const dup = await db.query('SELECT id FROM settings.locations WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL AND id != $2', [b.email.trim(), req.params.id]);
      if (dup.rows.length) return res.conflict(resp, 'Email already exists');
    }

    const result = await db.query(`
      UPDATE settings.locations SET
        organization_id=$1, name=$2, code=$3, type=$4, email=$5,
        primary_contact_code=$6, primary_contact_no=$7, alternate_contact_code=$8, alternate_contact_no=$9,
        is_active=$10, notes=$11, updated_by=$12, updated_at=NOW()
      WHERE id=$13 RETURNING *
    `, [
      b.organization_id||c.organization_id, b.name||c.name, b.code!==undefined?b.code:c.code,
      b.type||c.type, b.email!==undefined?b.email:c.email,
      b.primary_contact_code||c.primary_contact_code, b.primary_contact_no!==undefined?b.primary_contact_no:c.primary_contact_no,
      b.alternate_contact_code||c.alternate_contact_code, b.alternate_contact_no!==undefined?b.alternate_contact_no:c.alternate_contact_no,
      b.is_active!==undefined?b.is_active:c.is_active, b.notes!==undefined?b.notes:c.notes,
      req.user.id, req.params.id
    ]);

    await saveAddresses('location', req.params.id, b.addresses, req.user.id);

    return res.success(resp, { data: result.rows[0] }, 'Location updated successfully');
  } catch (err) {
    console.error('Update location error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const existing = await db.query('SELECT id FROM settings.locations WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Location not found');
    await db.query('UPDATE settings.locations SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [req.user.id, req.params.id]);
    return res.success(resp, {}, 'Location deleted successfully');
  } catch (err) {
    console.error('Delete location error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.badRequest(resp, 'ids array is required');
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await db.query(
      `UPDATE settings.locations SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
      [req.user.id, ...ids]
    );
    return res.success(resp, { deleted_count: result.rowCount }, `${result.rowCount} location(s) deleted`);
  } catch (err) {
    console.error('Delete multiple locations error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
