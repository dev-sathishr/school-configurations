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

    // Menus table (top-level navigation containers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        icon VARCHAR(300),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Modules table (pages/features under menus)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_id UUID NOT NULL REFERENCES settings.menus(id),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        icon VARCHAR(300),
        route VARCHAR(300),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // User groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.user_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Group permissions (group ↔ module with CRUD flags)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.group_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_group_id UUID NOT NULL REFERENCES settings.user_groups(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES settings.modules(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // User locations (user ↔ location for multi-location access)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.user_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES settings.users(id) ON DELETE CASCADE,
        location_id UUID NOT NULL REFERENCES settings.locations(id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT false,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add user_group_id to users
    await client.query(`
      ALTER TABLE settings.users ADD COLUMN IF NOT EXISTS user_group_id UUID REFERENCES settings.user_groups(id);
    `).catch(() => {});

    // Indexes for new tables
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_menus_code ON settings.menus(LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_menus_code already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_code ON settings.modules(LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_modules_code already exists'));
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_modules_menu ON settings.modules(menu_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_modules_menu already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_name ON settings.user_groups(LOWER(name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_user_groups_name already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_code ON settings.user_groups(LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_user_groups_code already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_perms_unique ON settings.group_permissions(user_group_id, module_id);
    `).catch(() => console.log('Index idx_group_perms_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locations_unique ON settings.user_locations(user_id, location_id);
    `).catch(() => console.log('Index idx_user_locations_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_locations_default ON settings.user_locations(user_id) WHERE is_default = true;
    `).catch(() => console.log('Index idx_user_locations_default already exists'));

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
