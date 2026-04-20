require('dotenv').config();
const { pool } = require('./index');

/**
 * Retention policy: delete sessions older than N days. The FK on
 * `session_activity.session_id` cascades the activity rows too, so one
 * DELETE on `sessions` is enough.
 *
 * Run manually:       node src/db/cleanup-sessions.js
 * Run with override:  node src/db/cleanup-sessions.js 30
 * Schedule via OS cron:
 *   0 2 * * *  cd /path/to/backend && node src/db/cleanup-sessions.js
 *
 * Kept intentionally dependency-free (no node-cron / no scheduler in the
 * main process). Easier to operate, easier to disable if something goes
 * wrong, and keeps the API pod stateless.
 */
const DEFAULT_DAYS = 90;

async function cleanup() {
  const days = Number(process.argv[2]) || DEFAULT_DAYS;
  if (!Number.isFinite(days) || days < 1) {
    console.error(`Invalid retention period: ${process.argv[2]}`);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log(`Deleting sessions older than ${days} days...`);

    // Activity first (no cascade configured in current schema) — explicit
    // delete keeps the script safe across schema variations.
    const activityResult = await client.query(
      `DELETE FROM settings.session_activity
       WHERE session_id IN (
         SELECT id FROM settings.sessions
         WHERE login_at < NOW() - ($1 || ' days')::INTERVAL
       )`,
      [days]
    );
    console.log(`  ${activityResult.rowCount} activity rows deleted`);

    const sessionResult = await client.query(
      `DELETE FROM settings.sessions
       WHERE login_at < NOW() - ($1 || ' days')::INTERVAL`,
      [days]
    );
    console.log(`  ${sessionResult.rowCount} session rows deleted`);

    console.log('Cleanup complete.');
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
