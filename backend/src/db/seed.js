require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./index');

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM settings.users WHERE username = $1', ['superadmin']);

    if (existing.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin@123', 10);

      await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['superadmin', hashedPassword, 'Super Admin', 'admin@shaanthied.com', 'super_admin', true]
      );

      console.log('Default super admin user created');
      console.log('Username: superadmin');
      console.log('Password: admin@123');
    } else {
      console.log('Super admin already exists, skipping seed');
    }
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
