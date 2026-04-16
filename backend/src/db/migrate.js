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
      CREATE TABLE IF NOT EXISTS settings.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Drop legacy role column and enum if they exist
    await client.query('ALTER TABLE settings.users DROP COLUMN IF EXISTS role').catch(() => {});
    await client.query('DROP TYPE IF EXISTS settings.user_role').catch(() => {});

    // Organizations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(300) NOT NULL,
        reg_no VARCHAR(100),
        email VARCHAR(200),
        primary_contact_code VARCHAR(10) DEFAULT '+91',
        primary_contact_no VARCHAR(20),
        alternate_contact_code VARCHAR(10) DEFAULT '+91',
        alternate_contact_no VARCHAR(20),
        website VARCHAR(300),
        social_facebook VARCHAR(300),
        social_instagram VARCHAR(300),
        social_twitter VARCHAR(300),
        social_linkedin VARCHAR(300),
        social_youtube VARCHAR(300),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Location type enum
    await client.query(`
      CREATE TYPE settings.location_type AS ENUM (
        'main_branch', 'branch', 'campus', 'annexure', 'hostel', 'playground', 'other'
      );
    `).catch(() => {
      console.log('Enum location_type already exists, skipping...');
    });

    // Locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES settings.organizations(id),
        name VARCHAR(300) NOT NULL,
        code VARCHAR(50),
        type settings.location_type DEFAULT 'branch',
        email VARCHAR(200),
        primary_contact_code VARCHAR(10) DEFAULT '+91',
        primary_contact_no VARCHAR(20),
        alternate_contact_code VARCHAR(10) DEFAULT '+91',
        alternate_contact_no VARCHAR(20),
        address_line1 VARCHAR(300),
        address_line2 VARCHAR(300),
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        country VARCHAR(100) DEFAULT 'India',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Addresses table (reusable across all modules)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address_line1 VARCHAR(300),
        address_line2 VARCHAR(300),
        pincode VARCHAR(10),
        post_office VARCHAR(200),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Address type enum
    await client.query(`
      CREATE TYPE settings.address_type AS ENUM (
        'primary', 'billing', 'shipping', 'branch', 'registered', 'communication', 'other'
      );
    `).catch(() => {
      console.log('Enum address_type already exists, skipping...');
    });

    // Address mappings table (polymorphic - links addresses to any entity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.address_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address_id UUID NOT NULL REFERENCES settings.addresses(id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        address_type settings.address_type DEFAULT 'primary',
        is_default BOOLEAN DEFAULT false,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Unique indexes (partial - only non-deleted records)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_name_unique ON settings.organizations (LOWER(name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_org_name_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_email_unique ON settings.organizations (LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL AND email != '';
    `).catch(() => console.log('Index idx_org_email_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_reg_no_unique ON settings.organizations (LOWER(reg_no)) WHERE deleted_at IS NULL AND reg_no IS NOT NULL AND reg_no != '';
    `).catch(() => console.log('Index idx_org_reg_no_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_loc_code_org_unique ON settings.locations (LOWER(code), organization_id) WHERE deleted_at IS NULL AND code IS NOT NULL AND code != '';
    `).catch(() => console.log('Index idx_loc_code_org_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_loc_email_unique ON settings.locations (LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL AND email != '';
    `).catch(() => console.log('Index idx_loc_email_unique already exists'));

    // Drop old tables from reverted commit (may exist with different schema)
    await client.query('DROP TABLE IF EXISTS settings.group_permissions CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.permissions CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.group_modules CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.menu_modules CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.groups CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.menus CASCADE').catch(() => {});
    await client.query('DROP TABLE IF EXISTS settings.modules CASCADE').catch(() => {});

    // Modules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        icon VARCHAR(300),
        route_path VARCHAR(300),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_module_code_unique ON settings.modules (LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_module_code_unique already exists'));

    // Menus table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        icon VARCHAR(300),
        route_path VARCHAR(300),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        parent_id UUID REFERENCES settings.menus(id),
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_code_unique ON settings.menus (LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_menu_code_unique already exists'));

    // Menu Modules table (links menus to modules)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.menu_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_id UUID NOT NULL REFERENCES settings.menus(id),
        module_id UUID NOT NULL REFERENCES settings.modules(id),
        display_order INT DEFAULT 0,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_module_unique ON settings.menu_modules (menu_id, module_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_menu_module_unique already exists'));

    // Groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_code_unique ON settings.groups (LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_group_code_unique already exists'));

    // Add group_id FK to users table (maps user to a group instead of enum role)
    await client.query(`
      ALTER TABLE settings.users ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES settings.groups(id);
    `).catch(() => {});

    // Group Modules table (links groups to menus/sidebar items)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.group_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES settings.groups(id),
        menu_id UUID NOT NULL REFERENCES settings.menus(id),
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_module_unique ON settings.group_modules (group_id, menu_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_group_module_unique already exists'));

    // Permissions master table (permission types like View, Create, Edit, Delete)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_code_unique ON settings.permissions (LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_permission_code_unique already exists'));

    // Group permissions table (group + module + permission type mapping)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.group_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES settings.groups(id),
        module_id UUID NOT NULL REFERENCES settings.modules(id),
        permission_id UUID NOT NULL REFERENCES settings.permissions(id),
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_permission_unique ON settings.group_permissions (group_id, module_id, permission_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_group_permission_unique already exists'));

    // Add soft delete columns to all settings tables
    const tables = ['settings.users', 'settings.organizations', 'settings.locations'];
    for (const table of tables) {
      await client.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES settings.users(id);
      `).catch(() => {});
      await client.query(`
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      `).catch(() => {});
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
