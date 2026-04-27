const db = require('../../config/database');

/**
 * Atomically generate the next code for a named sequence at a given location.
 *
 * Uses SELECT ... FOR UPDATE to lock the sequence_controls row, preventing
 * two concurrent requests from getting the same number. The lock is held
 * only for the duration of the UPDATE, then released on commit — no deadlock
 * risk as long as callers never lock two sequence rows in the same transaction.
 *
 * Returns { code } on success or { error, message } on failure.
 */
async function generateNextCode(sequenceCode, locationId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the control row for this sequence + location
    const ctrl = await client.query(`
      SELECT sc.id, sc.prefix, sc.suffix, sc.last_no, sc.max_no, sc.digit_length
      FROM settings.sequence_controls sc
      JOIN settings.sequence_codes s ON s.id = sc.sequence_code_id
      WHERE UPPER(s.code) = UPPER($1)
        AND sc.location_id = $2
        AND sc.is_active = true
        AND sc.deleted_at IS NULL
        AND s.deleted_at IS NULL
      FOR UPDATE
    `, [sequenceCode, locationId]);

    if (ctrl.rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'notFound', message: `No sequence control configured for '${sequenceCode}' at this location` };
    }

    const row = ctrl.rows[0];
    const nextNo = Number(row.last_no) + 1;

    if (nextNo > Number(row.max_no)) {
      await client.query('ROLLBACK');
      return { error: 'badRequest', message: `Sequence '${sequenceCode}' has reached its maximum (${row.max_no}). Please reconfigure the sequence control.` };
    }

    // Increment counter atomically
    await client.query(
      `UPDATE settings.sequence_controls SET last_no = $1, updated_at = NOW() WHERE id = $2`,
      [nextNo, row.id]
    );

    await client.query('COMMIT');

    const padded = String(nextNo).padStart(Number(row.digit_length), '0');
    return { code: `${row.prefix || ''}${padded}${row.suffix || ''}` };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Peek at what the next code would be without incrementing the counter.
 * Used for preview on the create form — safe to call multiple times.
 */
async function peekNextCode(sequenceCode, locationId) {
  const result = await db.pool.query(`
    SELECT sc.prefix, sc.suffix, sc.last_no, sc.digit_length
    FROM settings.sequence_controls sc
    JOIN settings.sequence_codes s ON s.id = sc.sequence_code_id
    WHERE UPPER(s.code) = UPPER($1)
      AND sc.location_id = $2
      AND sc.is_active = true
      AND sc.deleted_at IS NULL
      AND s.deleted_at IS NULL
  `, [sequenceCode, locationId]);

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const nextNo = Number(row.last_no) + 1;
  const padded = String(nextNo).padStart(Number(row.digit_length), '0');
  return `${row.prefix || ''}${padded}${row.suffix || ''}`;
}

module.exports = { generateNextCode, peekNextCode };
