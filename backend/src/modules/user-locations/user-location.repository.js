const db = require('../../config/database');

async function findByUserId(userId) {
  const result = await db.query(`
    SELECT ul.id, ul.location_id, ul.is_default, l.name, l.code, l.type,
           o.id AS org_id, o.name AS org_name
    FROM settings.user_locations ul
    JOIN settings.locations l ON l.id = ul.location_id
    LEFT JOIN settings.organizations o ON o.id = l.organization_id
    WHERE ul.user_id = $1 AND l.is_active = true AND l.deleted_at IS NULL
    ORDER BY ul.is_default DESC, l.name ASC
  `, [userId]);
  return result.rows;
}

async function setLocations(userId, locations, createdBy) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Remove existing assignments
    await client.query('DELETE FROM settings.user_locations WHERE user_id = $1', [userId]);

    // Insert new assignments
    for (const loc of locations) {
      await client.query(
        `INSERT INTO settings.user_locations (user_id, location_id, is_default, created_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, loc.location_id, loc.is_default || false, createdBy]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setDefaultLocation(userId, locationId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing default
    await client.query(
      'UPDATE settings.user_locations SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set new default
    await client.query(
      'UPDATE settings.user_locations SET is_default = true WHERE user_id = $1 AND location_id = $2',
      [userId, locationId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function hasAccess(userId, locationId) {
  const result = await db.query(
    'SELECT id FROM settings.user_locations WHERE user_id = $1 AND location_id = $2',
    [userId, locationId]
  );
  return result.rows.length > 0;
}

module.exports = { findByUserId, setLocations, setDefaultLocation, hasAccess };
