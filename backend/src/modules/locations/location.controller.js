const db = require('../../db');
const { paginate } = require('../../shared/helpers/pagination.helper');
const res = require('../../shared/helpers/response.helper');

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
      WHERE l.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.notFound(resp, 'Location not found');
    return res.success(resp, { data: result.rows[0] });
  } catch (err) {
    console.error('Get location error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const b = req.body;
    if (!b.name || !b.organization_id) return res.badRequest(resp, 'Name and organization are required');

    const result = await db.query(`
      INSERT INTO settings.locations (organization_id, name, code, type, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, address_line1, address_line2, city, state, pincode, country, is_active, notes, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      b.organization_id, b.name, b.code||null, b.type||'branch', b.email||null,
      b.primary_contact_code||'+91', b.primary_contact_no||null,
      b.alternate_contact_code||'+91', b.alternate_contact_no||null,
      b.address_line1||null, b.address_line2||null, b.city||null, b.state||null, b.pincode||null, b.country||'India',
      b.is_active!==undefined?b.is_active:true, b.notes||null, req.user.id, req.user.id
    ]);

    return res.created(resp, { data: result.rows[0] }, 'Location created successfully');
  } catch (err) {
    console.error('Create location error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const existing = await db.query('SELECT * FROM settings.locations WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Location not found');

    const c = existing.rows[0];
    const b = req.body;

    const result = await db.query(`
      UPDATE settings.locations SET
        organization_id=$1, name=$2, code=$3, type=$4, email=$5,
        primary_contact_code=$6, primary_contact_no=$7, alternate_contact_code=$8, alternate_contact_no=$9,
        address_line1=$10, address_line2=$11, city=$12, state=$13, pincode=$14, country=$15,
        is_active=$16, notes=$17, updated_by=$18, updated_at=NOW()
      WHERE id=$19 RETURNING *
    `, [
      b.organization_id||c.organization_id, b.name||c.name, b.code!==undefined?b.code:c.code,
      b.type||c.type, b.email!==undefined?b.email:c.email,
      b.primary_contact_code||c.primary_contact_code, b.primary_contact_no!==undefined?b.primary_contact_no:c.primary_contact_no,
      b.alternate_contact_code||c.alternate_contact_code, b.alternate_contact_no!==undefined?b.alternate_contact_no:c.alternate_contact_no,
      b.address_line1!==undefined?b.address_line1:c.address_line1, b.address_line2!==undefined?b.address_line2:c.address_line2,
      b.city!==undefined?b.city:c.city, b.state!==undefined?b.state:c.state,
      b.pincode!==undefined?b.pincode:c.pincode, b.country!==undefined?b.country:c.country,
      b.is_active!==undefined?b.is_active:c.is_active, b.notes!==undefined?b.notes:c.notes,
      req.user.id, req.params.id
    ]);

    return res.success(resp, { data: result.rows[0] }, 'Location updated successfully');
  } catch (err) {
    console.error('Update location error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const existing = await db.query('SELECT id FROM settings.locations WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Location not found');
    await db.query('DELETE FROM settings.locations WHERE id = $1', [req.params.id]);
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
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(`DELETE FROM settings.locations WHERE id IN (${placeholders}) RETURNING id`, ids);
    return res.success(resp, { deleted_count: result.rowCount }, `${result.rowCount} location(s) deleted`);
  } catch (err) {
    console.error('Delete multiple locations error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
