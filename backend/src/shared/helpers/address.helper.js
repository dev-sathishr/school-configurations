const db = require('../../config/database');

/**
 * Save addresses for an entity (create or update)
 * @param {string} entityType - e.g. 'organization', 'location', 'user'
 * @param {string} entityId - UUID of the entity
 * @param {Array} addresses - Array of address objects with address_type
 * @param {string} userId - Current user ID for audit
 */
async function saveAddresses(entityType, entityId, addresses, userId) {
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return;

  for (const addr of addresses) {
    if (addr.id) {
      // Update existing address
      await db.query(`
        UPDATE settings.addresses SET
          address_line1=$1, address_line2=$2, pincode=$3, post_office=$4,
          city=$5, state=$6, country=$7, updated_by=$8, updated_at=NOW()
        WHERE id=$9
      `, [
        addr.address_line1 || null, addr.address_line2 || null, addr.pincode || null,
        addr.post_office || null, addr.city || null, addr.state || null,
        addr.country || 'India', userId, addr.id,
      ]);
    } else {
      // Create new address + mapping
      const result = await db.query(`
        INSERT INTO settings.addresses (address_line1, address_line2, pincode, post_office, city, state, country, created_by, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id
      `, [
        addr.address_line1 || null, addr.address_line2 || null, addr.pincode || null,
        addr.post_office || null, addr.city || null, addr.state || null,
        addr.country || 'India', userId,
      ]);

      await db.query(`
        INSERT INTO settings.address_mappings (address_id, entity_type, entity_id, address_type, is_default, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [result.rows[0].id, entityType, entityId, addr.address_type || 'primary', addr.is_default || false, userId]);
    }
  }
}

/**
 * Get addresses for an entity
 */
async function getAddresses(entityType, entityId) {
  const result = await db.query(`
    SELECT a.*, am.address_type, am.is_default, am.id AS mapping_id
    FROM settings.addresses a
    JOIN settings.address_mappings am ON a.id = am.address_id
    WHERE am.entity_type = $1 AND am.entity_id = $2
      AND am.deleted_at IS NULL AND a.deleted_at IS NULL
    ORDER BY am.is_default DESC, a.created_at ASC
  `, [entityType, entityId]);
  return result.rows;
}

/**
 * Soft delete an address mapping
 */
async function removeAddress(addressId, userId) {
  await db.query('UPDATE settings.address_mappings SET deleted_at = NOW(), deleted_by = $1 WHERE address_id = $2', [userId, addressId]);
  await db.query('UPDATE settings.addresses SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2', [userId, addressId]);
}

module.exports = { saveAddresses, getAddresses, removeAddress };
