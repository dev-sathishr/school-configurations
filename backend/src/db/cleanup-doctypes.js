require('dotenv').config();
const { pool } = require('./index');

const SLUGS_TO_REMOVE = [
  'admission',
  'assessment',
  'client-script',
  'custom-field',
  'enquiry',
  'fee-schedule',
  'fee-schedule-item',
  'notification-template',
  'print-format',
  'recommendation',
  'registration',
  'server-script',
  'student-profile',
  'workflow',
];

async function cleanup() {
  const client = await pool.connect();
  try {
    const adminRes = await client.query(`SELECT id FROM settings.users WHERE username = 'superadmin' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    if (!adminId) { console.error('superadmin not found'); return; }

    for (const slug of SLUGS_TO_REMOVE) {
      // Soft-delete fields first
      const fieldRes = await client.query(
        `UPDATE engine.doctype_fields SET deleted_at = NOW(), deleted_by = $1
         WHERE doctype_id = (SELECT id FROM engine.doctypes WHERE slug = $2 AND deleted_at IS NULL)
           AND deleted_at IS NULL`,
        [adminId, slug]
      );

      // Soft-delete the doctype
      const dtRes = await client.query(
        `UPDATE engine.doctypes SET deleted_at = NOW(), deleted_by = $1
         WHERE slug = $2 AND deleted_at IS NULL
         RETURNING slug`,
        [adminId, slug]
      );

      if (dtRes.rows.length > 0) {
        console.log(`✓ Removed: ${slug} (${fieldRes.rowCount} fields deleted)`);
      } else {
        console.log(`- Not found or already removed: ${slug}`);
      }
    }

    console.log('\nDone. Run the app and refresh — those DocTypes will no longer appear.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
