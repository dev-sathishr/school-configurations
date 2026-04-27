const db = require('../../config/database');

async function saveBankAccount(entityType, entityId, data, userId) {
  if (data.id) {
    await db.query(`
      UPDATE settings.bank_accounts SET
        bank_name=$1, account_no=$2, ifsc_code=$3, branch_name=$4,
        account_holder=$5, account_type=$6, updated_by=$7, updated_at=NOW()
      WHERE id=$8
    `, [
      data.bank_name, data.account_no, data.ifsc_code || null,
      data.branch_name || null, data.account_holder || null,
      data.account_type || 'savings', userId, data.id,
    ]);

    // Update is_active on the mapping if it changed
    if (data.is_active !== undefined) {
      if (data.is_active) {
        // Clear any existing active first, then set this one
        await db.query(`
          UPDATE settings.bank_account_mappings SET is_active = false
          WHERE entity_type=$1 AND entity_id=$2 AND deleted_at IS NULL AND bank_account_id != $3
        `, [entityType, entityId, data.id]);
      }
      await db.query(`
        UPDATE settings.bank_account_mappings SET is_active=$1
        WHERE bank_account_id=$2 AND entity_type=$3 AND entity_id=$4 AND deleted_at IS NULL
      `, [data.is_active, data.id, entityType, entityId]);
    }
  } else {
    const result = await db.query(`
      INSERT INTO settings.bank_accounts
        (bank_name, account_no, ifsc_code, branch_name, account_holder, account_type, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id
    `, [
      data.bank_name, data.account_no, data.ifsc_code || null,
      data.branch_name || null, data.account_holder || null,
      data.account_type || 'savings', userId,
    ]);

    const bankAccountId = result.rows[0].id;
    const makeActive = data.is_active !== false;

    if (makeActive) {
      await db.query(`
        UPDATE settings.bank_account_mappings SET is_active = false
        WHERE entity_type=$1 AND entity_id=$2 AND deleted_at IS NULL
      `, [entityType, entityId]);
    }

    await db.query(`
      INSERT INTO settings.bank_account_mappings
        (bank_account_id, entity_type, entity_id, is_active, created_by)
      VALUES ($1,$2,$3,$4,$5)
    `, [bankAccountId, entityType, entityId, makeActive, userId]);
  }
}

async function getBankAccounts(entityType, entityId) {
  const result = await db.query(`
    SELECT ba.*, bam.is_active, bam.id AS mapping_id
    FROM settings.bank_accounts ba
    JOIN settings.bank_account_mappings bam ON ba.id = bam.bank_account_id
    WHERE bam.entity_type=$1 AND bam.entity_id=$2
      AND bam.deleted_at IS NULL AND ba.deleted_at IS NULL
    ORDER BY bam.is_active DESC, ba.created_at ASC
  `, [entityType, entityId]);
  return result.rows;
}

async function removeBankAccount(bankAccountId, userId) {
  await db.query(
    'UPDATE settings.bank_account_mappings SET deleted_at=NOW(), deleted_by=$1 WHERE bank_account_id=$2',
    [userId, bankAccountId]
  );
  await db.query(
    'UPDATE settings.bank_accounts SET deleted_at=NOW(), deleted_by=$1 WHERE id=$2',
    [userId, bankAccountId]
  );
}

async function setActiveBankAccount(bankAccountId, entityType, entityId, userId) {
  await db.query(`
    UPDATE settings.bank_account_mappings SET is_active=false
    WHERE entity_type=$1 AND entity_id=$2 AND deleted_at IS NULL
  `, [entityType, entityId]);
  await db.query(`
    UPDATE settings.bank_account_mappings SET is_active=true
    WHERE bank_account_id=$1 AND entity_type=$2 AND entity_id=$3 AND deleted_at IS NULL
  `, [bankAccountId, entityType, entityId]);
}

module.exports = { saveBankAccount, getBankAccounts, removeBankAccount, setActiveBankAccount };
