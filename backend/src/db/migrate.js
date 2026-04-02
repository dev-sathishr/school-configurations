require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '1234',
    database: 'postgres',
  });

  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'shaanthied'");

  if (result.rows.length === 0) {
    await client.query('CREATE DATABASE shaanthied');
    console.log('Database "shaanthied" created');
  } else {
    console.log('Database "shaanthied" already exists');
  }

  await client.end();
}

async function migrate() {
  await createDatabase();

  const { pool } = require('./index');
  const client = await pool.connect();

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await client.query('CREATE SCHEMA IF NOT EXISTS settings');

    await client.query(`
      CREATE TYPE settings.user_role AS ENUM (
        'super_admin', 'admin', 'principal', 'vice_principal', 'hod',
        'teacher', 'class_teacher', 'accountant', 'librarian', 'clerk',
        'lab_assistant', 'transport_manager', 'student', 'parent'
      );
    `).catch(() => {
      console.log('Enum user_role already exists, skipping...');
    });

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        phone VARCHAR(20),
        role settings.user_role DEFAULT 'clerk',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
