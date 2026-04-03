const db = require('../../db');
const { paginate } = require('../../shared/helpers/pagination.helper');
const res = require('../../shared/helpers/response.helper');

async function getAll(req, resp) {
  try {
    const result = await paginate({
      table: 'settings.organizations',
      alias: 'o',
      selectFields: `o.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name`,
      joins: 'LEFT JOIN settings.users cb ON o.created_by = cb.id LEFT JOIN settings.users ub ON o.updated_by = ub.id',
      searchColumns: ['o.name', 'o.reg_no', 'o.email', 'o.primary_contact_no'],
      filterableColumns: ['o.name', 'o.reg_no', 'o.email', 'o.is_active'],
      sortableColumns: ['o.name', 'o.reg_no', 'o.email', 'o.is_active', 'o.created_at'],
      defaultSortBy: 'o.created_at',
      defaultSortOrder: 'DESC',
    }, req.query);

    return res.success(resp, result);
  } catch (err) {
    console.error('Get organizations error:', err);
    return res.error(resp);
  }
}

async function getById(req, resp) {
  try {
    const result = await db.query(`
      SELECT o.*, cb.full_name AS created_by_name, ub.full_name AS updated_by_name
      FROM settings.organizations o
      LEFT JOIN settings.users cb ON o.created_by = cb.id
      LEFT JOIN settings.users ub ON o.updated_by = ub.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `, [req.params.id]);

    if (result.rows.length === 0) return res.notFound(resp, 'Organization not found');
    return res.success(resp, { data: result.rows[0] });
  } catch (err) {
    console.error('Get organization error:', err);
    return res.error(resp);
  }
}

async function create(req, resp) {
  try {
    const { name, reg_no, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, website, social_facebook, social_instagram, social_twitter, social_linkedin, social_youtube, is_active, notes } = req.body;

    if (!name) return res.badRequest(resp, 'Organization name is required');

    const result = await db.query(`
      INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, alternate_contact_code, alternate_contact_no, website, social_facebook, social_instagram, social_twitter, social_linkedin, social_youtube, is_active, notes, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [name, reg_no||null, email||null, primary_contact_code||'+91', primary_contact_no||null, alternate_contact_code||'+91', alternate_contact_no||null, website||null, social_facebook||null, social_instagram||null, social_twitter||null, social_linkedin||null, social_youtube||null, is_active!==undefined?is_active:true, notes||null, req.user.id, req.user.id]);

    return res.created(resp, { data: result.rows[0] }, 'Organization created successfully');
  } catch (err) {
    console.error('Create organization error:', err);
    return res.error(resp);
  }
}

async function update(req, resp) {
  try {
    const existing = await db.query('SELECT * FROM settings.organizations WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Organization not found');

    const c = existing.rows[0];
    const b = req.body;

    const result = await db.query(`
      UPDATE settings.organizations SET
        name=$1, reg_no=$2, email=$3, primary_contact_code=$4, primary_contact_no=$5,
        alternate_contact_code=$6, alternate_contact_no=$7, website=$8,
        social_facebook=$9, social_instagram=$10, social_twitter=$11, social_linkedin=$12, social_youtube=$13,
        is_active=$14, notes=$15, updated_by=$16, updated_at=NOW()
      WHERE id=$17 RETURNING *
    `, [
      b.name||c.name, b.reg_no!==undefined?b.reg_no:c.reg_no, b.email!==undefined?b.email:c.email,
      b.primary_contact_code||c.primary_contact_code, b.primary_contact_no!==undefined?b.primary_contact_no:c.primary_contact_no,
      b.alternate_contact_code||c.alternate_contact_code, b.alternate_contact_no!==undefined?b.alternate_contact_no:c.alternate_contact_no,
      b.website!==undefined?b.website:c.website,
      b.social_facebook!==undefined?b.social_facebook:c.social_facebook, b.social_instagram!==undefined?b.social_instagram:c.social_instagram,
      b.social_twitter!==undefined?b.social_twitter:c.social_twitter, b.social_linkedin!==undefined?b.social_linkedin:c.social_linkedin,
      b.social_youtube!==undefined?b.social_youtube:c.social_youtube,
      b.is_active!==undefined?b.is_active:c.is_active, b.notes!==undefined?b.notes:c.notes,
      req.user.id, req.params.id
    ]);

    return res.success(resp, { data: result.rows[0] }, 'Organization updated successfully');
  } catch (err) {
    console.error('Update organization error:', err);
    return res.error(resp);
  }
}

async function remove(req, resp) {
  try {
    const existing = await db.query('SELECT id FROM settings.organizations WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (existing.rows.length === 0) return res.notFound(resp, 'Organization not found');
    await db.query('UPDATE settings.organizations SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [req.user.id, req.params.id]);
    return res.success(resp, {}, 'Organization deleted successfully');
  } catch (err) {
    console.error('Delete organization error:', err);
    return res.error(resp);
  }
}

async function removeMultiple(req, resp) {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.badRequest(resp, 'ids array is required');
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await db.query(
      `UPDATE settings.organizations SET deleted_at = NOW(), deleted_by = $1 WHERE id IN (${placeholders}) AND deleted_at IS NULL RETURNING id`,
      [req.user.id, ...ids]
    );
    return res.success(resp, { deleted_count: result.rowCount }, `${result.rowCount} organization(s) deleted`);
  } catch (err) {
    console.error('Delete multiple organizations error:', err);
    return res.error(resp);
  }
}

// Dropdown list (for location form)
async function getDropdown(req, resp) {
  try {
    const result = await db.query('SELECT id, name FROM settings.organizations WHERE is_active = true AND deleted_at IS NULL ORDER BY name');
    return res.success(resp, { data: result.rows });
  } catch (err) {
    console.error('Get org dropdown error:', err);
    return res.error(resp);
  }
}

module.exports = { getAll, getById, create, update, remove, removeMultiple, getDropdown };
