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
    await client.query('CREATE SCHEMA IF NOT EXISTS employee');
    await client.query('CREATE SCHEMA IF NOT EXISTS master');

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

    // Add phone_code to users if missing
    await client.query(`ALTER TABLE settings.users ADD COLUMN IF NOT EXISTS phone_code VARCHAR(10) DEFAULT '+91'`).catch(() => {});
    await client.query(`ALTER TABLE settings.users ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) DEFAULT 'staff'`).catch(() => {});
    await client.query(`ALTER TABLE settings.users ADD COLUMN IF NOT EXISTS person_id UUID`).catch(() => {});

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

    // Student / relation modules use permanent/current/other. Keep legacy values for compatibility.
    await client.query(`ALTER TYPE settings.address_type ADD VALUE IF NOT EXISTS 'permanent'`).catch(() => {});
    await client.query(`ALTER TYPE settings.address_type ADD VALUE IF NOT EXISTS 'current'`).catch(() => {});

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

    // Backfill old relation/student address types into new naming.
    await client.query(`
      UPDATE settings.address_mappings
         SET address_type = 'permanent'
       WHERE entity_type IN ('student_profile', 'relation')
         AND address_type = 'primary'
         AND deleted_at IS NULL
    `).catch(() => {});
    await client.query(`
      UPDATE settings.address_mappings
         SET address_type = 'current'
       WHERE entity_type IN ('student_profile', 'relation')
         AND address_type = 'communication'
         AND deleted_at IS NULL
    `).catch(() => {});

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
        display_name VARCHAR(100) NOT NULL,
        icon VARCHAR(300),
        route_path VARCHAR(300),
        display_order INT DEFAULT 0,
        enforce_edit_lock BOOLEAN DEFAULT false,
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_module_display_name_unique ON settings.modules (LOWER(display_name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_module_display_name_unique already exists'));

    // Existing databases created before `enforce_edit_lock` was introduced.
    await client.query(`
      ALTER TABLE settings.modules
      ADD COLUMN IF NOT EXISTS enforce_edit_lock BOOLEAN DEFAULT false;
    `).catch(() => {});
    await client.query(`
      UPDATE settings.modules
         SET enforce_edit_lock = COALESCE(enforce_edit_lock, false)
       WHERE enforce_edit_lock IS NULL;
    `).catch(() => {});

    // Menus table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.menus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_display_name_unique ON settings.menus (LOWER(display_name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_menu_display_name_unique already exists'));

    // Menu Modules table (links menus to modules)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.menu_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        menu_id UUID NOT NULL REFERENCES settings.menus(id),
        module_id UUID NOT NULL REFERENCES settings.modules(id),
        display_order INT DEFAULT 0,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
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

    await client.query(`ALTER TABLE settings.groups ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) DEFAULT 'staff'`).catch(() => {});

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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_module_unique ON settings.group_modules (group_id, menu_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_group_module_unique already exists'));

    await client.query('ALTER TABLE settings.menu_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()').catch(() => {});
    await client.query('ALTER TABLE settings.group_modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()').catch(() => {});
    await client.query("UPDATE settings.menu_modules SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL").catch(() => {});
    await client.query("UPDATE settings.group_modules SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL").catch(() => {});

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

    // Employee master tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_categories (
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_category_code_unique
        ON employee.employee_categories (LOWER(code))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_category_code_unique already exists'));

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_category_id UUID REFERENCES employee.employee_categories(id),
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_group_code_unique
        ON employee.employee_groups (LOWER(code))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_group_code_unique already exists'));

    await client.query(`
      ALTER TABLE employee.employee_groups
      ADD COLUMN IF NOT EXISTS employee_category_id UUID REFERENCES employee.employee_categories(id);
    `).catch(() => {});

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_groups_category
        ON employee.employee_groups (employee_category_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_groups_category already exists'));

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.designations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_group_id UUID REFERENCES employee.employee_groups(id),
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_designation_code_unique
        ON employee.designations (LOWER(code))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_designation_code_unique already exists'));

    await client.query(`
      ALTER TABLE employee.designations
      ADD COLUMN IF NOT EXISTS employee_group_id UUID REFERENCES employee.employee_groups(id);
    `).catch(() => {});

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_designations_group
        ON employee.designations (employee_group_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_designations_group already exists'));

    // Employee info table — main employee record with personal + contact fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID REFERENCES settings.locations(id),
        designation_id UUID REFERENCES employee.designations(id),
        employee_name VARCHAR(200) NOT NULL,
        display_name VARCHAR(200),
        employee_code VARCHAR(50) NOT NULL,
        gender VARCHAR(20),
        dob DATE,
        blood_group VARCHAR(10),
        marital_status VARCHAR(30),
        religion VARCHAR(50),
        community VARCHAR(50),
        aadhaar_no VARCHAR(12),
        primary_contact_code VARCHAR(10) DEFAULT '+91',
        primary_contact_no VARCHAR(20),
        secondary_contact_code VARCHAR(10) DEFAULT '+91',
        secondary_contact_no VARCHAR(20),
        email VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_info_code_location_unique
        ON employee.employee_info (location_id, LOWER(employee_code))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_info_code_location_unique already exists'));

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_info_location
        ON employee.employee_info (location_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_info_location already exists'));

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_info_designation
        ON employee.employee_info (designation_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_info_designation already exists'));

    // Sequence codes — master list of named sequences (e.g. EMPLOYEE)
    await client.query(`
      CREATE TABLE IF NOT EXISTS master.sequence_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Document types master — categorised list of document types used when employees upload documents
    await client.query(`
      CREATE TABLE IF NOT EXISTS master.document_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        notes VARCHAR(500),
        document_no_label VARCHAR(100),
        validation_pattern VARCHAR(500),
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Add document_no_label and validation_pattern columns if upgrading an existing table
    await client.query(`ALTER TABLE master.document_types ADD COLUMN IF NOT EXISTS document_no_label VARCHAR(100)`);
    await client.query(`ALTER TABLE master.document_types ADD COLUMN IF NOT EXISTS validation_pattern VARCHAR(500)`);

    // Fee categories master — used to classify student fee line items
    await client.query(`
      CREATE TABLE IF NOT EXISTS master.fee_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fee_categories_code ON master.fee_categories(code) WHERE deleted_at IS NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fee_categories_active ON master.fee_categories(is_active) WHERE deleted_at IS NULL`);

    // Curriculum master - mirrors the SMS "curriculum" master
    await client.query(`
      CREATE TABLE IF NOT EXISTS master.curriculum (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        notes VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);
    await client.query(`ALTER TABLE master.curriculum ADD COLUMN IF NOT EXISTS notes VARCHAR(500)`).catch(() => {});
    await client.query(`ALTER TABLE master.curriculum ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`).catch(() => {});
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_name_unique ON master.curriculum (LOWER(name)) WHERE deleted_at IS NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_curriculum_active ON master.curriculum(is_active) WHERE deleted_at IS NULL`);

    // Sequence controls — per-location config: prefix, suffix, counter, max
    await client.query(`
      CREATE TABLE IF NOT EXISTS master.sequence_controls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_code_id UUID NOT NULL REFERENCES master.sequence_codes(id),
        location_id UUID NOT NULL REFERENCES settings.locations(id),
        prefix VARCHAR(20) DEFAULT '',
        suffix VARCHAR(20) DEFAULT '',
        last_no BIGINT NOT NULL DEFAULT 0,
        max_no BIGINT NOT NULL DEFAULT 9999,
        digit_length INT NOT NULL DEFAULT 3,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_sequence_control_code_location UNIQUE (sequence_code_id, location_id)
      );
    `);

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

    // Record-level edit locks. Applies only when the target module has
    // `settings.modules.enforce_edit_lock = true`.
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.record_edit_locks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_code VARCHAR(100) NOT NULL,
        record_id UUID NOT NULL,
        locked_by UUID NOT NULL REFERENCES settings.users(id),
        locked_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_record_edit_lock_unique
        ON settings.record_edit_locks (LOWER(module_code), record_id);
    `).catch(() => console.log('Index idx_record_edit_lock_unique already exists'));

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_record_edit_lock_expires
        ON settings.record_edit_locks (expires_at);
    `).catch(() => console.log('Index idx_record_edit_lock_expires already exists'));

    // Permission requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.permission_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requested_by UUID NOT NULL REFERENCES settings.users(id),
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        resolved_by UUID REFERENCES settings.users(id),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES settings.users(id),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(300) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON settings.notifications (user_id, is_read) WHERE is_read = false;
    `).catch(() => console.log('Index idx_notifications_user_unread already exists'));

    // Conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) DEFAULT 'direct',
        name VARCHAR(200),
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Conversation members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.conversation_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES settings.conversations(id),
        user_id UUID NOT NULL REFERENCES settings.users(id),
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_member_unique ON settings.conversation_members (conversation_id, user_id);
    `).catch(() => console.log('Index idx_conv_member_unique already exists'));

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES settings.conversations(id),
        sender_id UUID NOT NULL REFERENCES settings.users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON settings.messages (conversation_id, created_at DESC);
    `).catch(() => console.log('Index idx_messages_conversation already exists'));

    // Files table (polymorphic — links files to any entity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        stored_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        path VARCHAR(500) NOT NULL,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_files_entity ON settings.files (entity_type, entity_id, file_type) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_files_entity already exists'));

    // User locations mapping (many-to-many)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.user_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES settings.users(id),
        location_id UUID NOT NULL REFERENCES settings.locations(id),
        is_default BOOLEAN DEFAULT false,
        created_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add is_default column if missing (for existing tables)
    await client.query('ALTER TABLE settings.user_locations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false').catch(() => {});

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_location_unique ON settings.user_locations (user_id, location_id);
    `).catch(() => console.log('Index idx_user_location_unique already exists'));

    // User preferences (single JSONB doc per user)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.user_preferences (
        user_id UUID PRIMARY KEY REFERENCES settings.users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Fix previously seeded icon paths that point to non-existent assets.
    await client.query(`
      UPDATE settings.modules
         SET icon = 'assets/icons/heroicons/outline/users.svg'
       WHERE icon = 'assets/icons/heroicons/outline/user-group.svg';
    `).catch(() => {});

    // Replace the table-level UNIQUE on users.username with a partial unique
    // index so soft-deleted usernames don't block re-use.
    await client.query('ALTER TABLE settings.users DROP CONSTRAINT IF EXISTS users_username_key').catch(() => {});
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_unique
        ON settings.users (username)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_user_username_unique already exists'));

    // Ensure IMPORT and EXPORT permission types exist on existing databases.
    for (const perm of [
      { name: 'Import', code: 'IMPORT', description: 'Can bulk-import records from file' },
      { name: 'Export', code: 'EXPORT', description: 'Can download records as CSV/Excel/PDF' },
    ]) {
      await client.query(`
        INSERT INTO settings.permissions (name, code, description, is_active)
        SELECT $1, $2, $3, true
         WHERE NOT EXISTS (
           SELECT 1 FROM settings.permissions
            WHERE UPPER(code) = UPPER($2) AND deleted_at IS NULL
         )
      `, [perm.name, perm.code, perm.description]).catch(() => {});
    }

    // If previous builds introduced LOCK_EDIT as a group permission, retire it.
    await client.query(`
      UPDATE settings.group_permissions gp
         SET deleted_at = COALESCE(gp.deleted_at, NOW())
       WHERE gp.deleted_at IS NULL
         AND gp.permission_id IN (
           SELECT p.id FROM settings.permissions p
            WHERE UPPER(p.code) = 'LOCK_EDIT'
         );
    `).catch(() => {});
    await client.query(`
      UPDATE settings.permissions
         SET deleted_at = COALESCE(deleted_at, NOW())
       WHERE deleted_at IS NULL
         AND UPPER(code) = 'LOCK_EDIT';
    `).catch(() => {});

    // Grant IMPORT and EXPORT to SUPER_ADMIN on every existing module.
    // Idempotent: skips any (group, module, permission) triple that already exists.
    await client.query(`
      INSERT INTO settings.group_permissions (group_id, module_id, permission_id, created_by)
      SELECT g.id, m.id, p.id, g.created_by
        FROM settings.groups g
        CROSS JOIN settings.modules m
        CROSS JOIN settings.permissions p
       WHERE g.code = 'SUPER_ADMIN' AND g.deleted_at IS NULL
         AND m.deleted_at IS NULL
         AND p.code IN ('IMPORT', 'EXPORT') AND p.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM settings.group_permissions gp
            WHERE gp.group_id = g.id AND gp.module_id = m.id
              AND gp.permission_id = p.id AND gp.deleted_at IS NULL
         );
    `).catch(() => {});

    // Create academic schema
    await client.query('CREATE SCHEMA IF NOT EXISTS academic');

    // Academic level enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE academic.academic_level AS ENUM ('nursery', 'primary', 'middle', 'secondary', 'higher_secondary');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Class generals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic.class_generals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        code VARCHAR(50),
        strength INT DEFAULT 0,
        academic_level academic.academic_level NOT NULL DEFAULT 'primary',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_class_general_code_unique ON academic.class_generals (LOWER(code)) WHERE deleted_at IS NULL AND code IS NOT NULL AND code != '';
    `).catch(() => console.log('Index idx_class_general_code_unique already exists'));

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_class_general_name_unique ON academic.class_generals (LOWER(name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_class_general_name_unique already exists'));

    // Class levels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic.class_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_general_id UUID NOT NULL REFERENCES academic.class_generals(id),
        code VARCHAR(100) NOT NULL,
        section VARCHAR(1) CHECK (section ~ '^[A-Z]$'),
        capacity INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Rename legacy "name" column to "code" if it still exists
    await client.query('ALTER TABLE academic.class_levels RENAME COLUMN name TO code').catch(() => {});

    // Add section column if missing (for tables created before)
    await client.query("ALTER TABLE academic.class_levels ADD COLUMN IF NOT EXISTS section VARCHAR(1) CHECK (section ~ '^[A-Z]$')").catch(() => {});

    // Drop old index on name (if it exists) and create new on code
    await client.query('DROP INDEX IF EXISTS academic.idx_class_level_name_unique').catch(() => {});
    // Drop the old location-unaware index and replace with one scoped to location
    await client.query('DROP INDEX IF EXISTS academic.idx_class_level_code_unique').catch(() => {});
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_class_level_code_location_unique ON academic.class_levels (class_general_id, location_id, LOWER(code)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_class_level_code_location_unique already exists'));

    // Add notes column if missing
    await client.query('ALTER TABLE academic.class_levels ADD COLUMN IF NOT EXISTS notes TEXT').catch(() => {});

    // Add name column if missing
    await client.query('ALTER TABLE academic.class_levels ADD COLUMN IF NOT EXISTS name VARCHAR(200)').catch(() => {});

    // Associate each class-level section with a physical location
    await client.query(`
      ALTER TABLE academic.class_levels
        ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES settings.locations(id);
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_class_level_location ON academic.class_levels (location_id) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_class_level_location already exists'));

    // Academic years — scoped per location so multi-campus schools can run
    // their own calendars. `is_default` marks the current year for that
    // location; service + partial unique index both enforce one-default-per-location.
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic.academic_years (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID NOT NULL REFERENCES settings.locations(id),
        academic_year VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ,
        CHECK (end_date > start_date)
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_year_unique
        ON academic.academic_years (location_id, LOWER(academic_year))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_academic_year_unique already exists'));
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_academic_year_location
        ON academic.academic_years (location_id) WHERE deleted_at IS NULL;
    `).catch(() => {});
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_year_default
        ON academic.academic_years (location_id)
        WHERE is_default = true AND deleted_at IS NULL;
    `).catch(() => console.log('Index idx_academic_year_default already exists'));

    // Sessions — one row per login, records device + location + lifecycle.
    // `revoked_at` is admin force-logout, `logout_at` is user-initiated or
    // refresh-token based end. Both null == active.
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES settings.users(id),
        login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        logout_at TIMESTAMPTZ,
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        revoked_by UUID REFERENCES settings.users(id),
        ip_address INET,
        user_agent TEXT,
        latitude NUMERIC(9,6),
        longitude NUMERIC(9,6),
        location_label VARCHAR(200),
        login_method VARCHAR(20)
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user ON settings.sessions (user_id, login_at DESC)').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_active ON settings.sessions (user_id) WHERE logout_at IS NULL AND revoked_at IS NULL').catch(() => {});

    // Session activity — module/route visited within a session. Deduped at
    // the app layer (SessionTrackingService throttles same-route pings) so
    // the table stays small.
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.session_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES settings.sessions(id),
        module_code VARCHAR(50),
        route_path VARCHAR(200) NOT NULL,
        accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_activity_session ON settings.session_activity (session_id, accessed_at DESC)').catch(() => {});
    await client.query(`ALTER TABLE settings.session_activity ADD COLUMN IF NOT EXISTS exit_at TIMESTAMPTZ`).catch(() => {});
    await client.query(`ALTER TABLE settings.session_activity ADD COLUMN IF NOT EXISTS action_type VARCHAR(20)`).catch(() => {});
    await client.query(`ALTER TABLE settings.session_activity ADD COLUMN IF NOT EXISTS record_id UUID`).catch(() => {});
    await client.query(`ALTER TABLE settings.session_activity ADD COLUMN IF NOT EXISTS resource VARCHAR(100)`).catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_activity_open ON settings.session_activity (session_id) WHERE exit_at IS NULL AND action_type IS NULL').catch(() => {});

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

    // Key-value store for application-level settings (e.g. session retention).
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.app_settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      INSERT INTO settings.app_settings (key, value)
      VALUES ('session_retention_days', '90')
      ON CONFLICT (key) DO NOTHING;
    `);

    // ── Employee Payroll ──────────────────────────────────────────────────────
    // One row per employment period. An employee who resigns and rejoins gets a
    // new row. is_current = true marks the active period (enforced by partial
    // unique index). relieving_date / relieving_reason are null while employed.
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_payroll (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id         UUID NOT NULL REFERENCES employee.employee_info(id),
        joining_date        DATE NOT NULL,
        relieving_date      DATE,
        relieving_reason    VARCHAR(200),
        probation_end_date  DATE,
        wage_type           VARCHAR(20) DEFAULT 'monthly',
        basic_salary        NUMERIC(12,2),
        day_wages           NUMERIC(10,2),
        biometric_id        VARCHAR(50),
        epf_applicable      BOOLEAN DEFAULT false,
        epf_uan_no          VARCHAR(50),
        pf_no               VARCHAR(50),
        esi_applicable      BOOLEAN DEFAULT false,
        esi_no              VARCHAR(50),
        pan_no              VARCHAR(20),
        bank_name           VARCHAR(100),
        bank_account_no     VARCHAR(50),
        bank_ifsc           VARCHAR(20),
        is_current          BOOLEAN DEFAULT true,
        notes               TEXT,
        created_by          UUID REFERENCES settings.users(id),
        updated_by          UUID REFERENCES settings.users(id),
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        deleted_by          UUID REFERENCES settings.users(id),
        deleted_at          TIMESTAMPTZ
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_payroll_employee
        ON employee.employee_payroll (employee_id) WHERE deleted_at IS NULL;
    `).catch(() => {});
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_payroll_current
        ON employee.employee_payroll (employee_id)
        WHERE is_current = true AND deleted_at IS NULL;
    `).catch(() => console.log('Index idx_employee_payroll_current already exists'));

    // Drop bank columns from payroll — bank accounts are now a separate polymorphic table
    await client.query(`ALTER TABLE employee.employee_payroll DROP COLUMN IF EXISTS bank_name`).catch(() => {});
    await client.query(`ALTER TABLE employee.employee_payroll DROP COLUMN IF EXISTS bank_account_no`).catch(() => {});
    await client.query(`ALTER TABLE employee.employee_payroll DROP COLUMN IF EXISTS bank_ifsc`).catch(() => {});

    // Bank account type enum
    await client.query(`
      CREATE TYPE settings.bank_account_type AS ENUM (
        'savings', 'current', 'salary', 'other'
      );
    `).catch(() => console.log('Enum bank_account_type already exists, skipping...'));

    // Bank accounts — core account data (reusable across all modules)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.bank_accounts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_name       VARCHAR(100) NOT NULL,
        account_no      VARCHAR(50)  NOT NULL,
        ifsc_code       VARCHAR(20),
        branch_name     VARCHAR(100),
        account_holder  VARCHAR(200),
        account_type    settings.bank_account_type DEFAULT 'savings',
        created_by      UUID REFERENCES settings.users(id),
        updated_by      UUID REFERENCES settings.users(id),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        deleted_by      UUID REFERENCES settings.users(id),
        deleted_at      TIMESTAMPTZ
      );
    `);

    // Bank account mappings — polymorphic link to any entity
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.bank_account_mappings (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bank_account_id   UUID NOT NULL REFERENCES settings.bank_accounts(id),
        entity_type       VARCHAR(50) NOT NULL,
        entity_id         UUID NOT NULL,
        is_active         BOOLEAN DEFAULT true,
        created_by        UUID REFERENCES settings.users(id),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        deleted_by        UUID REFERENCES settings.users(id),
        deleted_at        TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bank_account_mappings_entity
        ON settings.bank_account_mappings (entity_type, entity_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // Only one active account per entity at a time
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_account_mappings_active
        ON settings.bank_account_mappings (entity_type, entity_id)
        WHERE is_active = true AND deleted_at IS NULL;
    `).catch(() => console.log('Index idx_bank_account_mappings_active already exists'));

    // ── Employee Qualifications ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_qualifications (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id       UUID NOT NULL REFERENCES employee.employee_info(id),
        degree            VARCHAR(50)  NOT NULL,
        field_of_study    VARCHAR(200),
        institution       VARCHAR(300) NOT NULL,
        board_university  VARCHAR(300),
        year_of_passing   SMALLINT,
        grade             VARCHAR(50),
        notes             VARCHAR(500),
        created_by        UUID REFERENCES settings.users(id),
        updated_by        UUID REFERENCES settings.users(id),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        deleted_by        UUID REFERENCES settings.users(id),
        deleted_at        TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_qualifications_employee
        ON employee.employee_qualifications (employee_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // ── Employee Experience ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_experience (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id       UUID NOT NULL REFERENCES employee.employee_info(id),
        organization      VARCHAR(300) NOT NULL,
        designation       VARCHAR(200),
        from_date         DATE NOT NULL,
        to_date           DATE,
        is_current        BOOLEAN DEFAULT false,
        notes             VARCHAR(500),
        created_by        UUID REFERENCES settings.users(id),
        updated_by        UUID REFERENCES settings.users(id),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        deleted_by        UUID REFERENCES settings.users(id),
        deleted_at        TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_experience_employee
        ON employee.employee_experience (employee_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // ── Employee Documents ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee.employee_documents (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id       UUID NOT NULL REFERENCES employee.employee_info(id),
        document_type_id  UUID NOT NULL REFERENCES master.document_types(id),
        document_no       VARCHAR(100),
        expiry_date       DATE,
        notes             VARCHAR(500),
        created_by        UUID REFERENCES settings.users(id),
        updated_by        UUID REFERENCES settings.users(id),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        deleted_by        UUID REFERENCES settings.users(id),
        deleted_at        TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_documents_employee
        ON employee.employee_documents (employee_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // ── Relations (shared, polymorphic — used by employee, student, etc.) ──
    // relation_type enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE settings.relation_type AS ENUM (
          'father','mother','spouse','son','daughter',
          'brother','sister','guardian','legal_guardian',
          'grandfather','grandmother','grandson','granddaughter',
          'uncle','aunt','nephew','niece',
          'stepfather','stepmother','stepson','stepdaughter',
          'father_in_law','mother_in_law','other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // relations — the family member's personal details (shared across all owner types)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.relations (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                  VARCHAR(200) NOT NULL,
        dob                   DATE,
        gender                VARCHAR(20),
        aadhaar_no            VARCHAR(12),
        contact_code          VARCHAR(10) DEFAULT '+91',
        contact_no            VARCHAR(20),
        email                 VARCHAR(100),
        occupation            VARCHAR(200),
        qualification         VARCHAR(100),
        annual_income         NUMERIC(15,2),
        notes                 VARCHAR(500),
        created_by            UUID REFERENCES settings.users(id),
        updated_by            UUID REFERENCES settings.users(id),
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        deleted_by            UUID REFERENCES settings.users(id),
        deleted_at            TIMESTAMPTZ
      );
    `);

    // relation_mappings — polymorphic link: any entity (employee/student/...) ↔ relation
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.relation_mappings (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        relation_id           UUID NOT NULL REFERENCES settings.relations(id),
        entity_type           VARCHAR(50) NOT NULL,
        entity_id             UUID NOT NULL,
        relation_type         settings.relation_type NOT NULL,
        is_emergency_contact  BOOLEAN DEFAULT false,
        created_by            UUID REFERENCES settings.users(id),
        updated_by            UUID REFERENCES settings.users(id),
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        deleted_by            UUID REFERENCES settings.users(id),
        deleted_at            TIMESTAMPTZ
      );
    `);

    // One relation_type per entity (except 'other' which allows multiples — enforced in app)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_relation_mappings_entity
        ON settings.relation_mappings (entity_type, entity_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // Only one emergency contact per entity
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_relation_mappings_emergency
        ON settings.relation_mappings (entity_type, entity_id)
        WHERE is_emergency_contact = true AND deleted_at IS NULL;
    `).catch(() => console.log('Index idx_relation_mappings_emergency already exists'));

    // is_linked flag — true when the mapping points to a shared/pre-existing relation row
    // (linked from another student's family). Prevents deleting the shared row on removal.
    await client.query(`
      ALTER TABLE settings.relation_mappings
        ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT false;
    `);

    // ── Student schema ────────────────────────────────────────────────────────
    await client.query('CREATE SCHEMA IF NOT EXISTS student');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE student.gender_type AS ENUM ('male','female','other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE student.blood_group_type AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE student.profile_status AS ENUM ('profile_created','enquiry','admitted','enrolled','withdrawn','alumni');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`ALTER TYPE student.profile_status ADD VALUE IF NOT EXISTS 'profile_created'`).catch(() => {});

    // Central student profile — one record per student across their lifecycle
    await client.query(`
      CREATE TABLE IF NOT EXISTS student.student_profiles (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_no          VARCHAR(50) UNIQUE,
        location_id         UUID NOT NULL REFERENCES settings.locations(id),
        first_name          VARCHAR(100) NOT NULL,
        middle_name         VARCHAR(100),
        last_name           VARCHAR(100),
        full_name           VARCHAR(300) GENERATED ALWAYS AS (
                              TRIM(first_name || ' ' || COALESCE(middle_name, '') || ' ' || COALESCE(last_name, ''))
                            ) STORED,
        dob                 DATE,
        gender              student.gender_type,
        blood_group         student.blood_group_type DEFAULT 'unknown',
        aadhaar_no          VARCHAR(12),
        mother_tongue       VARCHAR(100),
        religion            VARCHAR(100),
        community           VARCHAR(100),
        caste               VARCHAR(100),
        nationality         VARCHAR(100) DEFAULT 'Indian',
        birth_place         VARCHAR(100),
        primary_contact_code VARCHAR(10) DEFAULT '+91',
        primary_contact_no  VARCHAR(20),
        email               VARCHAR(100),
        status              student.profile_status DEFAULT 'profile_created',
        is_active           BOOLEAN DEFAULT TRUE,
        photo_url           VARCHAR(500),
        notes               VARCHAR(500),
        created_by          UUID REFERENCES settings.users(id),
        updated_by          UUID REFERENCES settings.users(id),
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        deleted_by          UUID REFERENCES settings.users(id),
        deleted_at          TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_profiles_location
        ON student.student_profiles (location_id)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_profiles_status
        ON student.student_profiles (status)
        WHERE deleted_at IS NULL;
    `).catch(() => {});

    // Add missing columns to existing student_profiles table
    await client.query(`ALTER TABLE student.student_profiles ADD COLUMN IF NOT EXISTS birth_place VARCHAR(100)`).catch(() => {});
    await client.query(`ALTER TABLE student.student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`).catch(() => {});
    await client.query(`ALTER TABLE student.student_profiles ALTER COLUMN status SET DEFAULT 'profile_created'`).catch(() => {});

    // ── Student Enquiries ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TYPE student.enquiry_status AS ENUM (
        'open', 'follow_up', 'converted', 'closed', 'cancelled'
      );
    `).catch(() => {});

    await client.query(`
      CREATE TABLE IF NOT EXISTS student.enquiries (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_profile_id  UUID NOT NULL REFERENCES student.student_profiles(id),
        enquiry_no          VARCHAR(50) NOT NULL,
        academic_year_id    UUID REFERENCES academic.academic_years(id),
        enquiry_date        DATE NOT NULL,
        enquired_by         VARCHAR(100) NOT NULL,
        relation_type       VARCHAR(50) NOT NULL,
        contact_code        VARCHAR(10) DEFAULT '+91',
        contact_no          VARCHAR(15) NOT NULL,
        enquired_class      VARCHAR(100) NOT NULL,
        current_school      VARCHAR(100),
        current_class       VARCHAR(100),
        current_curriculum  VARCHAR(100),
        source              VARCHAR(100),
        status              student.enquiry_status DEFAULT 'open',
        notes               VARCHAR(500),
        is_active           BOOLEAN DEFAULT TRUE,
        created_by          UUID REFERENCES settings.users(id),
        updated_by          UUID REFERENCES settings.users(id),
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ
      );
    `);

    await client.query(`
      ALTER TABLE student.enquiries
        ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic.academic_years(id);
      ALTER TABLE student.enquiries
        ADD COLUMN IF NOT EXISTS current_class VARCHAR(100);
      ALTER TABLE student.enquiries
        ADD COLUMN IF NOT EXISTS current_curriculum VARCHAR(100);
      ALTER TABLE student.enquiries
        ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES settings.locations(id);

      CREATE INDEX IF NOT EXISTS idx_enquiries_profile
        ON student.enquiries (student_profile_id)
        WHERE deleted_at IS NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enquiries_status
        ON student.enquiries (status)
        WHERE deleted_at IS NULL;
    `);

    // ── Recommenders master ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS student.recommenders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        contact_code VARCHAR(10) DEFAULT '+91',
        contact_no VARCHAR(15) NOT NULL,
        email VARCHAR(100),
        occupation VARCHAR(100),
        notes VARCHAR(500),
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_recommenders_contact_no_unique
        ON student.recommenders (contact_no)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_recommenders_contact_no_unique already exists'));

    // ── Recommendation mappings ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS student.recommendation_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_profile_id UUID NOT NULL REFERENCES student.student_profiles(id),
        recommender_id UUID NOT NULL REFERENCES student.recommenders(id),
        enquiry_id UUID REFERENCES student.enquiries(id),
        notes VARCHAR(500),
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
      CREATE INDEX IF NOT EXISTS idx_recommendation_mappings_profile
        ON student.recommendation_mappings (student_profile_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_recommendation_mappings_profile already exists'));

    // ── Assessments ────────────────────────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE student.assessment_type AS ENUM ('oral', 'written', 'oral_re', 'written_re', 'interview', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE student.assessment_result AS ENUM ('pass', 'fail', 'pending');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student.assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_profile_id UUID NOT NULL REFERENCES student.student_profiles(id),
        enquiry_id UUID NOT NULL REFERENCES student.enquiries(id),
        assessment_no VARCHAR(50) NOT NULL,
        assessment_date DATE NOT NULL,
        type student.assessment_type NOT NULL,
        assessed_by_id UUID REFERENCES settings.users(id),
        sanctioned_class_id UUID REFERENCES academic.class_generals(id),
        academic_year_id UUID REFERENCES academic.academic_years(id),
        completed BOOLEAN NOT NULL DEFAULT false,
        result student.assessment_result NOT NULL DEFAULT 'pending',
        grade VARCHAR(10),
        marks NUMERIC(6,2),
        notes VARCHAR(500),
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
      CREATE INDEX IF NOT EXISTS idx_assessments_profile
        ON student.assessments (student_profile_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_assessments_profile already exists'));

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assessments_enquiry
        ON student.assessments (enquiry_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_assessments_enquiry already exists'));

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_assessments_no_unique
        ON student.assessments (LOWER(assessment_no))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_assessments_no_unique already exists'));

    // ── Registrations ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS student.registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_profile_id UUID NOT NULL REFERENCES student.student_profiles(id),
        enquiry_id UUID NOT NULL REFERENCES student.enquiries(id),
        registration_no VARCHAR(50) NOT NULL,
        registration_date DATE NOT NULL,
        academic_year_id UUID NOT NULL REFERENCES academic.academic_years(id),
        sanctioned_class_id UUID NOT NULL REFERENCES academic.class_generals(id),
        notes VARCHAR(500),
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
      CREATE INDEX IF NOT EXISTS idx_registrations_profile
        ON student.registrations (student_profile_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_registrations_profile already exists'));

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registrations_enquiry
        ON student.registrations (enquiry_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_registrations_enquiry already exists'));

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_no_unique
        ON student.registrations (LOWER(registration_no))
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_registrations_no_unique already exists'));

    // One active registration per (student, enquiry, sanctioned_class) — prevents
    // the same student from being registered twice for the same class on the
    // same enquiry. They can register for different classes (rare but allowed).
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_unique_per_enquiry_class
        ON student.registrations (student_profile_id, enquiry_id, sanctioned_class_id)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_registrations_unique_per_enquiry_class already exists'));

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
