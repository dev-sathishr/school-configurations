const db = require('../../config/database');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizedAddressSnapshot(addr) {
  return {
    address_line1: normalizeText(addr.address_line1) || null,
    address_line2: normalizeText(addr.address_line2) || null,
    pincode: normalizeText(addr.pincode) || null,
    post_office: normalizeText(addr.post_office) || null,
    city: normalizeText(addr.city) || null,
    state: normalizeText(addr.state) || null,
    country: normalizeText(addr.country) || 'India',
  };
}

/**
 * Save addresses for an entity (create or update)
 * @param {string} entityType - e.g. 'organization', 'location', 'user'
 * @param {string} entityId - UUID of the entity
 * @param {Array} addresses - Array of address objects with address_type
 * @param {string} userId - Current user ID for audit
 */
async function saveAddresses(entityType, entityId, addresses, userId) {
  if (!addresses || !Array.isArray(addresses) || addresses.length === 0) return [];

  const saved = [];

  for (const addr of addresses) {
    const addressType = addr.address_type || ((entityType === 'student_profile' || entityType === 'relation') ? 'permanent' : 'primary');
    const isDefault = addr.is_default || false;
    const snapshot = normalizedAddressSnapshot(addr);

    if (addr.id) {
      const mapping = await db.query(`
        SELECT id, address_type, is_default
        FROM settings.address_mappings
        WHERE address_id = $1 AND entity_type = $2 AND entity_id = $3
          AND deleted_at IS NULL
        LIMIT 1
      `, [addr.id, entityType, entityId]);

      if (mapping.rows[0]) {
        // Existing mapping for this entity: normal edit flow, update address details.
        await db.query(`
          UPDATE settings.addresses SET
            address_line1=$1, address_line2=$2, pincode=$3, post_office=$4,
            city=$5, state=$6, country=$7, updated_by=$8, updated_at=NOW()
          WHERE id=$9
        `, [
          snapshot.address_line1, snapshot.address_line2, snapshot.pincode,
          snapshot.post_office, snapshot.city, snapshot.state, snapshot.country,
          userId, addr.id,
        ]);

        if (mapping.rows[0].address_type !== addressType || Boolean(mapping.rows[0].is_default) !== Boolean(isDefault)) {
          await db.query(`
            UPDATE settings.address_mappings
            SET address_type = $1, is_default = $2
            WHERE id = $3 AND deleted_at IS NULL
          `, [addressType, isDefault, mapping.rows[0].id]);
        }
      } else {
        // Reuse existing address id for this entity by creating only mapping.
        await db.query(`
          INSERT INTO settings.address_mappings (address_id, entity_type, entity_id, address_type, is_default, created_by)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [addr.id, entityType, entityId, addressType, isDefault, userId]);
      }

      saved.push({ id: addr.id, address_type: addressType, ...snapshot });
    } else {
      // Create new address + mapping
      const result = await db.query(`
        INSERT INTO settings.addresses (address_line1, address_line2, pincode, post_office, city, state, country, created_by, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id
      `, [
        snapshot.address_line1, snapshot.address_line2, snapshot.pincode,
        snapshot.post_office, snapshot.city, snapshot.state, snapshot.country, userId,
      ]);

      await db.query(`
        INSERT INTO settings.address_mappings (address_id, entity_type, entity_id, address_type, is_default, created_by)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [result.rows[0].id, entityType, entityId, addressType, isDefault, userId]);

      saved.push({ id: result.rows[0].id, address_type: addressType, ...snapshot });
    }
  }

  return saved;
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
