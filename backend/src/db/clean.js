require('dotenv').config();
const { pool } = require('./index');

async function clean() {
  const client = await pool.connect();
  try {
    console.log('Cleaning database...');

    // Drop schemas cascade — removes all tables, types, indexes, enums inside them
    await client.query('DROP SCHEMA IF EXISTS academic CASCADE');
    console.log('Dropped schema: academic');

    await client.query('DROP SCHEMA IF EXISTS settings CASCADE');
    console.log('Dropped schema: settings');

    console.log('Database cleaned successfully');
  } catch (err) {
    console.error('Clean failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();
