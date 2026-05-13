/**
 * One-time migration: copies existing data from settings.* tables into engine."slug" tables.
 * Skips rows where the name/code already exists in the destination.
 * Safe to re-run.
 */
require('dotenv').config();
const { pool } = require('./index');

async function migrate() {
  const client = await pool.connect();
  try {
    const adminRes = await client.query(`SELECT id FROM settings.users WHERE username = 'superadmin' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    if (!adminId) { console.error('superadmin not found — run seed.js first'); return; }

    // ── Groups ────────────────────────────────────────────────────────────────
    {
      const rows = await client.query(
        `SELECT name, code, description, created_by, updated_by, created_at, updated_at
         FROM settings.groups WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."groups" WHERE LOWER(code)=LOWER($1) AND deleted_at IS NULL`, [r.code]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."groups" (name, code, description, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,true,$4,$5,$6,$7)`,
          [r.name, r.code, r.description, r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`groups: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    {
      const rows = await client.query(
        `SELECT name, code, description, created_by, updated_by, created_at, updated_at
         FROM settings.permissions WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."permissions" WHERE LOWER(code)=LOWER($1) AND deleted_at IS NULL`, [r.code]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."permissions" (name, code, description, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,true,$4,$5,$6,$7)`,
          [r.name, r.code, r.description, r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`permissions: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Menus ─────────────────────────────────────────────────────────────────
    {
      const rows = await client.query(
        `SELECT name, display_name, icon, route_path, display_order, description, created_by, updated_by, created_at, updated_at
         FROM settings.menus WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."menus" WHERE LOWER(name)=LOWER($1) AND deleted_at IS NULL`, [r.name]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."menus" (name, display_name, icon, route_path, display_order, description, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10)`,
          [r.name, r.display_name, r.icon, r.route_path, r.display_order, r.description,
           r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`menus: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Modules ───────────────────────────────────────────────────────────────
    {
      const rows = await client.query(
        `SELECT name, display_name, icon, route_path, display_order, description, created_by, updated_by, created_at, updated_at
         FROM settings.modules WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."modules" WHERE LOWER(name)=LOWER($1) AND deleted_at IS NULL`, [r.name]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."modules" (name, display_name, icon, route_path, display_order, description, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10)`,
          [r.name, r.display_name, r.icon, r.route_path, r.display_order, r.description,
           r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`modules: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Organizations ─────────────────────────────────────────────────────────
    // settings columns: name, reg_no, email, primary_contact_code, primary_contact_no, website
    // engine columns:   name, reg_no, email, primary_phone_code,   primary_phone,       website
    {
      const rows = await client.query(
        `SELECT name, reg_no, email, primary_contact_code, primary_contact_no,
                website, created_by, updated_by, created_at, updated_at
         FROM settings.organizations WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."organizations" WHERE LOWER(name)=LOWER($1) AND deleted_at IS NULL`, [r.name]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."organizations"
             (name, reg_no, email, primary_phone_code, primary_phone, website, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10)`,
          [r.name, r.reg_no, r.email, r.primary_contact_code || '+91', r.primary_contact_no,
           r.website, r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`organizations: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Locations ─────────────────────────────────────────────────────────────
    // settings columns: name, code, type, organization_id(FK to settings.org), email, primary_contact_code, primary_contact_no
    // engine columns:   name, code, type, organization_id(text → engine.org id), email, primary_phone_code, primary_phone
    {
      // Build name→id map for engine organizations
      const engOrgs = await client.query(`SELECT id, name FROM engine."organizations" WHERE deleted_at IS NULL`);
      const settOrgs = await client.query(`SELECT id, name FROM settings.organizations WHERE deleted_at IS NULL`);
      const orgNameById = new Map(settOrgs.rows.map(o => [o.id, o.name]));
      const engOrgIdByName = new Map(engOrgs.rows.map(o => [o.name, o.id]));

      const rows = await client.query(
        `SELECT name, code, type, organization_id, email,
                primary_contact_code, primary_contact_no, created_by, updated_by, created_at, updated_at
         FROM settings.locations WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."locations" WHERE LOWER(code)=LOWER($1) AND deleted_at IS NULL`, [r.code]);
        if (exists.rows.length > 0) continue;
        const orgName = orgNameById.get(r.organization_id);
        const engOrgId = orgName ? (engOrgIdByName.get(orgName) || null) : null;
        await client.query(
          `INSERT INTO engine."locations"
             (name, code, type, organization_id, email, primary_phone_code, primary_phone, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11)`,
          [r.name, r.code, r.type, engOrgId ? String(engOrgId) : null,
           r.email, r.primary_contact_code || '+91', r.primary_contact_no,
           r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`locations: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    // Drop NOT NULL on password first (engine users are display-only records, auth is in settings.users)
    await client.query(`ALTER TABLE engine."users" ALTER COLUMN "password" DROP NOT NULL`);
    {
      const rows = await client.query(
        `SELECT full_name, username, email, phone_code, phone, created_by, updated_by, created_at, updated_at
         FROM settings.users WHERE deleted_at IS NULL`
      );
      let n = 0;
      for (const r of rows.rows) {
        const exists = await client.query(`SELECT id FROM engine."users" WHERE LOWER(username)=LOWER($1) AND deleted_at IS NULL`, [r.username]);
        if (exists.rows.length > 0) continue;
        await client.query(
          `INSERT INTO engine."users" (full_name, username, email, phone_code, phone, is_active, created_by, updated_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8,$9)`,
          [r.full_name, r.username, r.email, r.phone_code, r.phone,
           r.created_by || adminId, r.updated_by || adminId, r.created_at, r.updated_at]
        );
        n++;
      }
      console.log(`users: ${n} migrated, ${rows.rows.length - n} skipped (already exist)`);
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
