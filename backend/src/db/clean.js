require('dotenv').config();
const { Client } = require('pg');

const url = new URL(process.env.DATABASE_URL);
const DB_NAME = url.pathname.replace('/', '');

async function clean() {
  // Connect to the target DB to drop schemas; if it doesn't exist, nothing to clean.
  const client = new Client({
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: DB_NAME,
  });

  try {
    await client.connect();
  } catch (err) {
    if (err.code === '3D000') {
      console.log(`Database "${DB_NAME}" does not exist — nothing to clean.`);
      return;
    }
    throw err;
  }

  try {
    console.log('Cleaning database...');

    await client.query('DROP SCHEMA IF EXISTS student CASCADE');
    console.log('Dropped schema: student');

    await client.query('DROP SCHEMA IF EXISTS employee CASCADE');
    console.log('Dropped schema: employee');

    await client.query('DROP SCHEMA IF EXISTS master CASCADE');
    console.log('Dropped schema: master');

    await client.query('DROP SCHEMA IF EXISTS academic CASCADE');
    console.log('Dropped schema: academic');

    await client.query('DROP SCHEMA IF EXISTS settings CASCADE');
    console.log('Dropped schema: settings');

    console.log('Database cleaned successfully');
  } catch (err) {
    console.error('Clean failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clean();
