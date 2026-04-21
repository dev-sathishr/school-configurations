const db = require('../../config/database');

const LOCK_TTL_SECONDS = normalizeTtlSeconds(process.env.EDIT_LOCK_TTL_SECONDS);

function normalizeTtlSeconds(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 900; // 15 minutes default
  return Math.max(60, Math.min(7200, Math.floor(parsed)));
}

function normalizeModuleCode(code) {
  return String(code || '').trim().toUpperCase();
}

function lockConflictMessage(lock) {
  const who = lock?.locked_by_name || lock?.locked_by_username || 'another user';
  return `This record is currently being edited by ${who}.`;
}

async function findModuleByCode(moduleCode) {
  const result = await db.query(`
    SELECT id, code, enforce_edit_lock
      FROM settings.modules
     WHERE UPPER(code) = UPPER($1)
       AND deleted_at IS NULL
     LIMIT 1
  `, [moduleCode]);
  return result.rows[0] || null;
}

async function userHasEditPermission(userId, moduleCode) {
  const result = await db.query(`
    SELECT 1
      FROM settings.users u
      JOIN settings.group_permissions gp ON gp.group_id = u.group_id AND gp.deleted_at IS NULL
      JOIN settings.modules mod ON gp.module_id = mod.id AND mod.deleted_at IS NULL
      JOIN settings.permissions p ON gp.permission_id = p.id AND p.deleted_at IS NULL
     WHERE u.id = $1
       AND UPPER(mod.code) = UPPER($2)
       AND UPPER(p.code) = 'EDIT'
     LIMIT 1
  `, [userId, moduleCode]);

  return result.rows.length > 0;
}

async function cleanupExpiredLocks(client = db) {
  await client.query(`
    DELETE FROM settings.record_edit_locks
     WHERE expires_at <= NOW()
  `);
}

async function getActiveLock(moduleCode, recordId, client = db) {
  const result = await client.query(`
    SELECT l.id, l.module_code, l.record_id, l.locked_by, l.locked_at, l.expires_at,
           u.full_name AS locked_by_name, u.username AS locked_by_username
      FROM settings.record_edit_locks l
      JOIN settings.users u ON u.id = l.locked_by
     WHERE UPPER(l.module_code) = UPPER($1)
       AND l.record_id = $2
       AND l.expires_at > NOW()
     LIMIT 1
  `, [moduleCode, recordId]);
  return result.rows[0] || null;
}

async function acquireLock(userId, payload) {
  const moduleCode = normalizeModuleCode(payload?.module_code);
  const recordId = String(payload?.record_id || '').trim();

  if (!moduleCode || !recordId) {
    return { error: 'badRequest', message: 'module_code and record_id are required' };
  }

  const mod = await findModuleByCode(moduleCode);
  if (!mod) {
    return { error: 'badRequest', message: 'Invalid module_code' };
  }

  if (!mod.enforce_edit_lock) {
    return { data: { enabled: false, acquired: false, lock: null } };
  }

  const canEdit = await userHasEditPermission(userId, moduleCode);
  if (!canEdit) {
    return { error: 'forbidden', message: 'You do not have permission to edit this module' };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await cleanupExpiredLocks(client);

    const rowResult = await client.query(`
      SELECT id, locked_by
        FROM settings.record_edit_locks
       WHERE UPPER(module_code) = UPPER($1)
         AND record_id = $2
       FOR UPDATE
    `, [moduleCode, recordId]);

    const existing = rowResult.rows[0] || null;

    if (existing && existing.locked_by !== userId) {
      const lock = await getActiveLock(moduleCode, recordId, client);
      await client.query('ROLLBACK');
      return { error: 'conflict', message: lockConflictMessage(lock) };
    }

    if (existing && existing.locked_by === userId) {
      await client.query(`
        UPDATE settings.record_edit_locks
           SET locked_at = NOW(),
               expires_at = NOW() + ($2 * INTERVAL '1 second'),
               updated_at = NOW()
         WHERE id = $1
      `, [existing.id, LOCK_TTL_SECONDS]);
    } else {
      await client.query(`
        INSERT INTO settings.record_edit_locks (module_code, record_id, locked_by, locked_at, expires_at, updated_at)
        VALUES (UPPER($1), $2, $3, NOW(), NOW() + ($4 * INTERVAL '1 second'), NOW())
      `, [moduleCode, recordId, userId, LOCK_TTL_SECONDS]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');

    // Rare race: two inserts at once before either sees the lock row.
    if (err?.code === '23505') {
      const active = await getActiveLock(moduleCode, recordId);
      if (active && active.locked_by !== userId) {
        return { error: 'conflict', message: lockConflictMessage(active) };
      }
      if (active && active.locked_by === userId) {
        return { data: { enabled: true, acquired: true, lock: active } };
      }
    }

    throw err;
  } finally {
    client.release();
  }

  const lock = await getActiveLock(moduleCode, recordId);
  return { data: { enabled: true, acquired: true, lock } };
}

async function releaseLock(userId, payload) {
  const moduleCode = normalizeModuleCode(payload?.module_code);
  const recordId = String(payload?.record_id || '').trim();

  if (!moduleCode || !recordId) {
    return { error: 'badRequest', message: 'module_code and record_id are required' };
  }

  const mod = await findModuleByCode(moduleCode);
  if (!mod) {
    return { error: 'badRequest', message: 'Invalid module_code' };
  }

  await cleanupExpiredLocks();

  const result = await db.query(`
    DELETE FROM settings.record_edit_locks
     WHERE UPPER(module_code) = UPPER($1)
       AND record_id = $2
       AND locked_by = $3
  `, [moduleCode, recordId, userId]);

  return { data: { enabled: !!mod.enforce_edit_lock, released: result.rowCount > 0 } };
}

async function checkRecordLockConflict(userId, moduleCode, recordId) {
  const normalizedModuleCode = normalizeModuleCode(moduleCode);
  const normalizedRecordId = String(recordId || '').trim();
  if (!normalizedModuleCode || !normalizedRecordId) return { conflict: false };

  const mod = await findModuleByCode(normalizedModuleCode);
  if (!mod || !mod.enforce_edit_lock) return { conflict: false };

  await cleanupExpiredLocks();
  const active = await getActiveLock(normalizedModuleCode, normalizedRecordId);
  if (!active) {
    return {
      conflict: true,
      message: 'Edit lock was not acquired for this record. Please reopen the edit page and try again.',
    };
  }
  if (active.locked_by === userId) return { conflict: false };

  return { conflict: true, message: lockConflictMessage(active), lock: active };
}

module.exports = {
  LOCK_TTL_SECONDS,
  acquireLock,
  releaseLock,
  checkRecordLockConflict,
};
