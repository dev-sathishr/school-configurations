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
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'school_configurations'");

  if (result.rows.length === 0) {
    await client.query('CREATE DATABASE school_configurations');
    console.log('Database "school_configurations" created');
  } else {
    console.log('Database "school_configurations" already exists');
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
        phone_code VARCHAR(10) DEFAULT '+91',
        person_type VARCHAR(20) DEFAULT 'staff',
        person_id UUID,
        group_id UUID,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_by UUID REFERENCES settings.users(id),
        updated_by UUID REFERENCES settings.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_unique
        ON settings.users (username)
        WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_user_username_unique already exists'));

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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_name_unique ON settings.organizations (LOWER(name)) WHERE deleted_at IS NULL;
    `).catch(() => console.log('Index idx_org_name_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_email_unique ON settings.organizations (LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL AND email != '';
    `).catch(() => console.log('Index idx_org_email_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_reg_no_unique ON settings.organizations (LOWER(reg_no)) WHERE deleted_at IS NULL AND reg_no IS NOT NULL AND reg_no != '';
    `).catch(() => console.log('Index idx_org_reg_no_unique already exists'));

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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_by UUID REFERENCES settings.users(id),
        deleted_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_loc_code_org_unique ON settings.locations (LOWER(code), organization_id) WHERE deleted_at IS NULL AND code IS NOT NULL AND code != '';
    `).catch(() => console.log('Index idx_loc_code_org_unique already exists'));
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_loc_email_unique ON settings.locations (LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL AND email != '';
    `).catch(() => console.log('Index idx_loc_email_unique already exists'));

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

    // Add group_id FK to users table
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

    // Permissions master table
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

    // Record-level edit locks
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

    // Sessions table
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

    // Session activity table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings.session_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES settings.sessions(id),
        module_code VARCHAR(50),
        route_path VARCHAR(200) NOT NULL,
        accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exit_at TIMESTAMPTZ,
        action_type VARCHAR(20),
        record_id UUID,
        resource VARCHAR(100)
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_activity_session ON settings.session_activity (session_id, accessed_at DESC)').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_activity_open ON settings.session_activity (session_id) WHERE exit_at IS NULL AND action_type IS NULL').catch(() => {});

    // Key-value store for application-level settings
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

    // Ensure IMPORT and EXPORT permission types exist
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

    // Grant IMPORT and EXPORT to SUPER_ADMIN on every existing module (idempotent)
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

    // ── Engine schema (DocType engine) ─────────────────────────────────
    await client.query('CREATE SCHEMA IF NOT EXISTS engine');

    await client.query(`
      CREATE TABLE IF NOT EXISTS engine.doctypes (
        id                  SERIAL PRIMARY KEY,
        slug                VARCHAR(64) NOT NULL UNIQUE,
        label               VARCHAR(128) NOT NULL,
        plural_label        VARCHAR(128) NOT NULL,
        icon                VARCHAR(64),
        description         TEXT,
        is_location_scoped  BOOLEAN NOT NULL DEFAULT false,
        auto_create_table   BOOLEAN NOT NULL DEFAULT true,
        table_status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (table_status IN ('pending','active','error')),
        last_error          TEXT,
        schema_name         VARCHAR(63) NOT NULL DEFAULT 'engine',
        display_mode        VARCHAR(20) NOT NULL DEFAULT 'page'
                            CHECK (display_mode IN ('page','modal','tab-group')),
        modal_size          VARCHAR(20) NOT NULL DEFAULT 'medium'
                            CHECK (modal_size IN ('small','medium','large','xlarge')),
        tab_children        JSONB,
        meta_version        INTEGER NOT NULL DEFAULT 1,
        is_active           BOOLEAN NOT NULL DEFAULT true,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by          UUID REFERENCES settings.users(id),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by          UUID REFERENCES settings.users(id),
        deleted_at          TIMESTAMPTZ,
        deleted_by          UUID REFERENCES settings.users(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS engine.doctype_fields (
        id              SERIAL PRIMARY KEY,
        doctype_id      INTEGER NOT NULL REFERENCES engine.doctypes(id) ON DELETE CASCADE,
        field_name      VARCHAR(64) NOT NULL,
        field_label     VARCHAR(128) NOT NULL,
        field_type      VARCHAR(32) NOT NULL
                        CHECK (field_type IN (
                          'text','email','url','number','date',
                          'select','async-select','textarea','checkbox','phone','password','file','address','relation-widget'
                        )),
        display_order   INTEGER NOT NULL DEFAULT 0,
        col_span        INTEGER NOT NULL DEFAULT 6 CHECK (col_span BETWEEN 1 AND 12),
        section_name    VARCHAR(128),
        validators      JSONB NOT NULL DEFAULT '{}',
        is_unique       BOOLEAN NOT NULL DEFAULT false,
        is_searchable   BOOLEAN NOT NULL DEFAULT true,
        is_filterable   BOOLEAN NOT NULL DEFAULT false,
        is_readonly     BOOLEAN NOT NULL DEFAULT false,
        is_hidden       BOOLEAN NOT NULL DEFAULT false,
        show_in_list    BOOLEAN NOT NULL DEFAULT true,
        help_text       TEXT,
        select_options  JSONB,
        ref_doctype_slug VARCHAR(64),
        default_value   TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES settings.users(id),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES settings.users(id),
        deleted_at      TIMESTAMPTZ,
        deleted_by      UUID REFERENCES settings.users(id),
        UNIQUE (doctype_id, field_name)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctype_fields_doctype_id ON engine.doctype_fields(doctype_id);
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctype_fields_order ON engine.doctype_fields(doctype_id, display_order);
    `).catch(() => {});
    await client.query(`
      ALTER TABLE engine.doctype_fields
        ADD COLUMN IF NOT EXISTS col_span INTEGER NOT NULL DEFAULT 6
          CHECK (col_span BETWEEN 1 AND 12);
    `).catch(() => {});

    // ── Master schema ───────────────────────────────────────────────────
    await client.query('CREATE SCHEMA IF NOT EXISTS master');

    await client.query(`
      CREATE TABLE IF NOT EXISTS master.sequence_codes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code        VARCHAR(20) NOT NULL,
        name        VARCHAR(100) NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by  UUID REFERENCES settings.users(id),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by  UUID REFERENCES settings.users(id),
        deleted_at  TIMESTAMPTZ,
        deleted_by  UUID REFERENCES settings.users(id),
        CONSTRAINT uq_sequence_codes_code UNIQUE (code)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS master.sequence_controls (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_code_id  UUID NOT NULL REFERENCES master.sequence_codes(id),
        location_id       UUID NOT NULL REFERENCES settings.locations(id),
        prefix            VARCHAR(20) NOT NULL DEFAULT '',
        suffix            VARCHAR(20) NOT NULL DEFAULT '',
        digit_length      INTEGER NOT NULL DEFAULT 3,
        last_no           BIGINT NOT NULL DEFAULT 0,
        max_no            BIGINT NOT NULL DEFAULT 9999,
        is_active         BOOLEAN NOT NULL DEFAULT true,
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by        UUID REFERENCES settings.users(id),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by        UUID REFERENCES settings.users(id),
        deleted_at        TIMESTAMPTZ,
        deleted_by        UUID REFERENCES settings.users(id),
        CONSTRAINT uq_sequence_control_code_location UNIQUE (sequence_code_id, location_id)
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
