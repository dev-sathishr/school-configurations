require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const password = require('../shared/helpers/password.helper');
const { pool } = require('./index');

const organizations = [
  { name: 'Shaanthi Matriculation School', reg_no: 'REG-2024-001', email: 'info@shaanthi.edu.in', primary_contact_no: '9876543210', website: 'https://www.shaanthi.edu.in' },
];

const SEED_ASSETS_DIR = path.join(__dirname, 'seed-assets');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Seed a profile image for a user. Idempotent — skips if the user already
 * has a `profile_image` row. Copies the source asset into `uploads/` with a
 * fresh UUID filename and inserts a `settings.files` row matching what the
 * file-upload API would produce, so the existing profile rendering code
 * doesn't need to know this came from the seed.
 */
async function seedProfileImage(client, userId, assetFile) {
  const sourcePath = path.join(SEED_ASSETS_DIR, assetFile);
  if (!fs.existsSync(sourcePath)) {
    console.log(`  Asset ${assetFile} not found, skipping profile image`);
    return;
  }

  const existing = await client.query(
    `SELECT id FROM settings.files
     WHERE entity_type = 'user' AND entity_id = $1 AND file_type = 'profile_image' AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0) {
    console.log(`  Profile image already set, skipping`);
    return;
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(assetFile).toLowerCase();
  const storedName = `${uuidv4()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, storedName);
  fs.copyFileSync(sourcePath, destPath);

  const stats = fs.statSync(destPath);
  await client.query(
    `INSERT INTO settings.files
       (entity_type, entity_id, file_type, original_name, stored_name, mime_type, size, path, created_by)
     VALUES ('user', $1, 'profile_image', $2, $3, $4, $5, $6, $1)`,
    [userId, assetFile, storedName, MIME_BY_EXT[ext] || 'application/octet-stream', stats.size, `uploads/${storedName}`]
  );
  console.log(`  Profile image seeded (${assetFile})`);
}

async function seed() {
  const client = await pool.connect();
  try {
    // Seed super admin
    const existing = await client.query('SELECT id FROM settings.users WHERE username = $1', ['superadmin']);
    let adminId;

    if (existing.rows.length === 0) {
      const hashedPassword = await password.hash('admin@123');
      const result = await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['superadmin', hashedPassword, 'Super Admin', 'admin@shaanthied.com', '+91', '9876500001', true]
      );
      adminId = result.rows[0].id;
      console.log('Default super admin user created');
      console.log('Username: superadmin');
      console.log('Password: admin@123');
    } else {
      adminId = existing.rows[0].id;
      console.log('Super admin already exists, skipping user seed');
    }
    await seedProfileImage(client, adminId, 'superadmin.jpg');

    // Seed organizations (skip existing by name)
    let inserted = 0;
    for (const org of organizations) {
      const exists = await client.query('SELECT id FROM settings.organizations WHERE name = $1', [org.name]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO settings.organizations (name, reg_no, email, primary_contact_code, primary_contact_no, website, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [org.name, org.reg_no, org.email, '+91', org.primary_contact_no, org.website || null, true, adminId, adminId]
        );
        inserted++;
      }
    }
    console.log(inserted > 0 ? `${inserted} organization(s) seeded` : 'All organizations already exist, skipping');

    // Clear old seed data from these tables (re-seed fresh)
    await client.query('DELETE FROM settings.notifications');
    await client.query('DELETE FROM settings.permission_requests');
    await client.query('DELETE FROM settings.group_permissions');
    await client.query('DELETE FROM settings.group_modules');
    await client.query('DELETE FROM settings.menu_modules');
    await client.query('DELETE FROM settings.permissions');
    // Null out group_id on all users before deleting groups (FK constraint)
    await client.query('UPDATE settings.users SET group_id = NULL');
    await client.query('DELETE FROM settings.groups');
    await client.query('DELETE FROM settings.menus');
    await client.query('DELETE FROM settings.modules');

    // Seed Permission types (master data)
    const permissionTypes = [
      { name: 'View', code: 'VIEW', description: 'Can view records' },
      { name: 'Create', code: 'CREATE', description: 'Can create new records' },
      { name: 'Edit', code: 'EDIT', description: 'Can edit existing records' },
      { name: 'Delete', code: 'DELETE', description: 'Can delete records' },
      { name: 'Import', code: 'IMPORT', description: 'Can bulk-import records from file' },
      { name: 'Export', code: 'EXPORT', description: 'Can download records as CSV/Excel/PDF' },
    ];

    const permissionIds = {};
    for (const perm of permissionTypes) {
      const result = await client.query(
        `INSERT INTO settings.permissions (name, code, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5) RETURNING id`,
        [perm.name, perm.code, perm.description, adminId, adminId]
      );
      permissionIds[perm.code] = result.rows[0].id;
    }
    console.log(`Permissions seeded (${Object.keys(permissionIds).length} types)`);

    // Seed Menus (top-level sidebar navigation groups)
    const menus = [
      { key: 'DASHBOARD', name: 'Dashboard', display_name: 'Dashboard', description: 'Quick overview of school activity and key stats',       icon: 'assets/icons/heroicons/outline/chart-pie.svg', route_path: '/dashboard', display_order: 1 },
      { key: 'ACADEMIC',  name: 'Academic',  display_name: 'Academic',  description: 'Manage your school academic configuration',             icon: 'assets/icons/heroicons/outline/bookmark.svg',  route_path: '/academic',   display_order: 2 },
      { key: 'EMPLOYEE',  name: 'Employee',  display_name: 'Employee',  description: 'Manage employee setup and master data',                 icon: 'assets/icons/heroicons/outline/users.svg',     route_path: '/employee',   display_order: 3 },
      { key: 'STUDENT',   name: 'Student',   display_name: 'Student',   description: 'Manage student admissions and enrollment',              icon: 'assets/icons/heroicons/outline/user-circle.svg', route_path: '/student', display_order: 4 },
      { key: 'MASTER',    name: 'Master',    display_name: 'Master',    description: 'Configure sequences, codes and system-level masters',   icon: 'assets/icons/heroicons/outline/adjustments-horizontal.svg', route_path: '/master', display_order: 5 },
      { key: 'SETTINGS',  name: 'Settings',  display_name: 'Settings',  description: 'Manage your school system configuration',               icon: 'assets/icons/heroicons/outline/cog.svg',       route_path: '/settings',   display_order: 6 },
    ];

    const menuIds = {};
    for (const menu of menus) {
      const result = await client.query(
        `INSERT INTO settings.menus (name, display_name, description, icon, route_path, display_order, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8) RETURNING id`,
        [menu.name, menu.display_name, menu.description || null, menu.icon, menu.route_path, menu.display_order, adminId, adminId]
      );
      menuIds[menu.key] = result.rows[0].id;
    }
    console.log(`Menus seeded (${Object.keys(menuIds).length} total)`);

    // Seed Modules (feature pages / sub-items within menus).
    // Dashboard is intentionally a menu-only entry — a welcome landing page
    // with no CRUD modules. Groups get dashboard access by being assigned the
    // DASHBOARD menu in group_modules; no per-module permissions are needed.
    const modules = [
      // Academic modules
      { key: 'CLASSES',             name: 'Classes',         display_name: 'Class Master',    icon: 'assets/icons/heroicons/outline/table-cells.svg',       route_path: '/academic/class',            display_order: 1, enforce_edit_lock: false, description: 'Manage classes and sections with academic levels' },
      { key: 'CLASS_LEVELS',        name: 'Class Level',     display_name: 'Class Level',     icon: 'assets/icons/heroicons/outline/table-cells.svg',       route_path: '/academic/class',            display_order: 2, enforce_edit_lock: false, description: 'Define class sections and capacity per location' },
      // Employee modules
      { key: 'EMPLOYEE_CATEGORIES', name: 'Employee Master', display_name: 'Employee Categories', icon: 'assets/icons/heroicons/outline/users.svg',             route_path: '/employee/employee-master',  display_order: 1, enforce_edit_lock: false, description: 'Manage employee categories, groups and designations' },
      { key: 'EMPLOYEE_GROUPS',     name: 'Employee Groups', display_name: 'Employee Groups', icon: 'assets/icons/heroicons/outline/users.svg',             route_path: '/employee/employee-master',  display_order: 2, enforce_edit_lock: false, description: 'Organise employees into functional groups' },
      { key: 'DESIGNATIONS',        name: 'Designations',    display_name: 'Designations',    icon: 'assets/icons/heroicons/outline/cube.svg',              route_path: '/employee/employee-master',  display_order: 3, enforce_edit_lock: false, description: 'Define job roles and designations for staff' },
      { key: 'EMPLOYEE_INFO',       name: 'Employee Info',   display_name: 'Employee Info',   icon: 'assets/icons/heroicons/outline/user-circle.svg',      route_path: '/employee/employee-info',    display_order: 4, enforce_edit_lock: false, description: 'Manage employee personal, contact and address details' },
      // Academic Years is a calendar master used as *config* by admins; it
      // lives under SETTINGS, not ACADEMIC, so route_path + menu_module
      // point there. display_order picks up where the settings modules end.
      { key: 'ACADEMIC_YEARS',      name: 'Academic Years',  display_name: 'Academic Years',  icon: 'assets/icons/heroicons/outline/bookmark.svg',          route_path: '/settings/academic-year',    display_order: 9, enforce_edit_lock: false, description: 'Set up school calendars per location — one default per year' },
      // Settings modules
      { key: 'ORGANIZATIONS',       name: 'Organizations',   display_name: 'Organizations',   icon: 'assets/icons/heroicons/outline/cube.svg',              route_path: '/settings/organization',     display_order: 1, enforce_edit_lock: false, description: 'Manage organizations and their details' },
      { key: 'LOCATIONS',           name: 'Locations',       display_name: 'Locations',       icon: 'assets/icons/heroicons/outline/bookmark.svg',          route_path: '/settings/location',         display_order: 2, enforce_edit_lock: false, description: 'Manage branches, campuses and locations' },
      { key: 'USERS',               name: 'Users',           display_name: 'Users',           icon: 'assets/icons/heroicons/outline/users.svg',             route_path: '/settings/user',             display_order: 3, enforce_edit_lock: false, description: 'Manage system users, roles and permissions' },
      { key: 'MODULES',             name: 'Modules',         display_name: 'Modules',         icon: 'assets/icons/heroicons/outline/cube.svg',              route_path: '/settings/module',           display_order: 4, enforce_edit_lock: false, description: 'Manage application modules and feature pages' },
      { key: 'MENUS',               name: 'Menus',           display_name: 'Menus',           icon: 'assets/icons/heroicons/outline/bookmark.svg',          route_path: '/settings/menu',             display_order: 5, enforce_edit_lock: false, description: 'Manage navigation menus and assign modules' },
      { key: 'GROUPS',              name: 'Groups',          display_name: 'Groups',          icon: 'assets/icons/heroicons/outline/users.svg',             route_path: '/settings/group',            display_order: 6, enforce_edit_lock: false, description: 'Manage user groups, menu access and permissions' },
      { key: 'PERMISSIONS',         name: 'Permissions',     display_name: 'Permissions',     icon: 'assets/icons/heroicons/outline/shield-check.svg',      route_path: '/settings/permission',       display_order: 7, enforce_edit_lock: false, description: 'Manage permission types like View, Create, Edit and Delete' },
      { key: 'SESSIONS',            name: 'Sessions',        display_name: 'Sessions',        icon: 'assets/icons/heroicons/outline/shield-exclamation.svg', route_path: '/settings/session',         display_order: 8, enforce_edit_lock: false, description: 'Monitor active sessions, login history and activity' },
      // Master modules
      { key: 'SEQUENCE_CODES',    name: 'Sequence Codes',    display_name: 'Sequence Master',   icon: 'assets/icons/heroicons/outline/adjustments-horizontal.svg',     route_path: '/master/sequence',       display_order: 1, enforce_edit_lock: false, description: 'Configure sequence codes and controls for auto-numbering' },
      { key: 'SEQUENCE_CONTROLS', name: 'Sequence Controls', display_name: 'Sequence Controls', icon: 'assets/icons/heroicons/outline/adjustments-horizontal.svg',     route_path: '/master/sequence',       display_order: 2, enforce_edit_lock: false, description: 'Configure prefix, suffix, counter and limit per location and sequence type' },
      { key: 'DOCUMENT_TYPES',    name: 'Document Types',    display_name: 'Document Types',    icon: 'assets/icons/heroicons/outline/folder.svg',                      route_path: '/master/document-types', display_order: 3, enforce_edit_lock: false, description: 'Manage document type categories used for employee document uploads' },
      { key: 'FEE_CATEGORIES',   name: 'Fee Categories',    display_name: 'Fee Categories',    icon: 'assets/icons/heroicons/outline/table-cells.svg',                 route_path: '/master/fee-categories', display_order: 4, enforce_edit_lock: false, description: 'Manage fee category types used to classify student fee items' },
      { key: 'CURRICULUM',       name: 'Curriculum',        display_name: 'Curriculum',        icon: 'assets/icons/heroicons/outline/bookmark.svg',                    route_path: '/master/curriculum',     display_order: 5, enforce_edit_lock: false, description: 'Manage curriculum master data such as CBSE, ICSE and State Board' },
      // Student modules
      { key: 'STUDENT_PROFILE', name: 'Student Profile', display_name: 'Admission Management', icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/student/admission', display_order: 1, enforce_edit_lock: false, description: 'Manage student profiles and admission records' },
      { key: 'ENQUIRY',         name: 'Enquiry',         display_name: 'Enquiry',              icon: 'assets/icons/heroicons/outline/users.svg', route_path: '/student/admission', display_order: 2, enforce_edit_lock: false, description: 'Manage student enquiries and follow-up details' },
    ];

    const moduleIds = {};
    for (const mod of modules) {
      const result = await client.query(
        `INSERT INTO settings.modules (name, display_name, icon, route_path, display_order, enforce_edit_lock, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9) RETURNING id`,
        [mod.name, mod.display_name, mod.icon, mod.route_path, mod.display_order, !!mod.enforce_edit_lock, mod.description || null, adminId, adminId]
      );
      moduleIds[mod.key] = result.rows[0].id;
    }
    console.log(`Modules seeded (${Object.keys(moduleIds).length} total)`);

    // Seed Menu Modules (link modules under their parent menu).
    // DASHBOARD has no entries here — it's a leaf menu pointing directly to
    // its own route_path.
    const menuModuleMappings = [
      // Academic modules
      { menu: 'ACADEMIC', module: 'CLASSES', display_order: 1 },
      { menu: 'ACADEMIC', module: 'CLASS_LEVELS', display_order: 2 },
      // Employee modules
      { menu: 'EMPLOYEE', module: 'EMPLOYEE_CATEGORIES', display_order: 1 },
      { menu: 'EMPLOYEE', module: 'EMPLOYEE_GROUPS', display_order: 2 },
      { menu: 'EMPLOYEE', module: 'DESIGNATIONS', display_order: 3 },
      { menu: 'EMPLOYEE', module: 'EMPLOYEE_INFO', display_order: 4 },
      // Settings modules
      { menu: 'SETTINGS', module: 'ORGANIZATIONS', display_order: 1 },
      { menu: 'SETTINGS', module: 'LOCATIONS', display_order: 2 },
      { menu: 'SETTINGS', module: 'USERS', display_order: 3 },
      { menu: 'SETTINGS', module: 'MODULES', display_order: 4 },
      { menu: 'SETTINGS', module: 'MENUS', display_order: 5 },
      { menu: 'SETTINGS', module: 'GROUPS', display_order: 6 },
      { menu: 'SETTINGS', module: 'PERMISSIONS', display_order: 7 },
      { menu: 'SETTINGS', module: 'SESSIONS', display_order: 8 },
      { menu: 'SETTINGS', module: 'ACADEMIC_YEARS', display_order: 9 },
      // Master modules
      { menu: 'MASTER', module: 'SEQUENCE_CODES',    display_order: 1 },
      { menu: 'MASTER', module: 'SEQUENCE_CONTROLS', display_order: 2 },
      { menu: 'MASTER', module: 'DOCUMENT_TYPES',    display_order: 3 },
      { menu: 'MASTER', module: 'FEE_CATEGORIES',    display_order: 4 },
      { menu: 'MASTER', module: 'CURRICULUM',        display_order: 5 },
      // Student modules
      { menu: 'STUDENT', module: 'STUDENT_PROFILE', display_order: 1 },
      { menu: 'STUDENT', module: 'ENQUIRY',         display_order: 2 },
    ];

    let mmInserted = 0;
    for (const mm of menuModuleMappings) {
      const menuId = menuIds[mm.menu];
      const modId = moduleIds[mm.module];
      if (menuId && modId) {
        await client.query(
          `INSERT INTO settings.menu_modules (menu_id, module_id, display_order, created_by) VALUES ($1, $2, $3, $4)`,
          [menuId, modId, mm.display_order, adminId]
        );
        mmInserted++;
      }
    }
    console.log(`Menu Modules seeded (${mmInserted} mappings)`);

    // Seed Groups
    const groups = [
      { name: 'Super Admin', code: 'SUPER_ADMIN', person_type: 'staff',    description: 'Full system access with all permissions' },
      { name: 'Admin',       code: 'ADMIN',       person_type: 'staff',    description: 'Administrative access to settings and management' },
      { name: 'Principal',   code: 'PRINCIPAL',   person_type: 'employee', description: 'School principal with academic and admin access' },
      { name: 'Teacher',     code: 'TEACHER',     person_type: 'employee', description: 'Teaching staff with academic access' },
      { name: 'Accountant',  code: 'ACCOUNTANT',  person_type: 'employee', description: 'Finance and accounts access' },
      { name: 'Student',     code: 'STUDENT',     person_type: 'student',  description: 'Student portal access' },
      { name: 'Parent',      code: 'PARENT',      person_type: 'parent',   description: 'Parent portal access' },
    ];

    const groupIds = {};
    for (const group of groups) {
      const result = await client.query(
        `INSERT INTO settings.groups (name, code, person_type, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, true, $5, $6)
         ON CONFLICT DO NOTHING RETURNING id`,
        [group.name, group.code, group.person_type || 'staff', group.description, adminId, adminId]
      );
      groupIds[group.code] = result.rows[0].id;
    }
    console.log(`Groups seeded (${Object.keys(groupIds).length} total)`);

    // Assign super admin user to SUPER_ADMIN group
    await client.query('UPDATE settings.users SET group_id = $1 WHERE id = $2', [groupIds['SUPER_ADMIN'], adminId]);
    console.log('Super admin user assigned to SUPER_ADMIN group');

    // Seed admin user
    const existingAdmin = await client.query('SELECT id FROM settings.users WHERE username = $1', ['admin']);
    let adminUserId;
    if (existingAdmin.rows.length === 0) {
      const adminPwd = await password.hash('admin@123');
      const result = await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, group_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9) RETURNING id`,
        ['admin', adminPwd, 'Admin User', 'admin@shaanthied.com', '+91', '9876500002', groupIds['ADMIN'], adminId, adminId]
      );
      adminUserId = result.rows[0].id;
      console.log('Admin user created (username: admin, password: admin@123)');
    } else {
      // Re-assign group_id in case groups were re-created with new IDs
      await client.query('UPDATE settings.users SET group_id = $1 WHERE username = $2', [groupIds['ADMIN'], 'admin']);
      adminUserId = existingAdmin.rows[0].id;
      console.log('Admin user already exists, group_id updated');
    }
    await seedProfileImage(client, adminUserId, 'admin.png');

    // Seed teacher user
    const existingTeacher = await client.query('SELECT id FROM settings.users WHERE username = $1', ['teacher']);
    if (existingTeacher.rows.length === 0) {
      const teacherPwd = await password.hash('teacher@123');
      await client.query(
        `INSERT INTO settings.users (username, password, full_name, email, phone_code, phone, group_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
        ['teacher', teacherPwd, 'Teacher User', 'teacher@shaanthied.com', '+91', '9876500003', groupIds['TEACHER'], adminId, adminId]
      );
      console.log('Teacher user created (username: teacher, password: teacher@123)');
    } else {
      await client.query('UPDATE settings.users SET group_id = $1 WHERE username = $2', [groupIds['TEACHER'], 'teacher']);
      console.log('Teacher user already exists, group_id updated');
    }

    // Seed Group Modules (which menus each group can access)
    const groupModuleMappings = [
      { group: 'SUPER_ADMIN', menus: ['DASHBOARD', 'ACADEMIC', 'EMPLOYEE', 'STUDENT', 'MASTER', 'SETTINGS'] },
      { group: 'PRINCIPAL', menus: ['DASHBOARD'] },
      { group: 'TEACHER', menus: ['DASHBOARD'] },
      { group: 'ACCOUNTANT', menus: ['DASHBOARD'] },
      { group: 'STUDENT', menus: ['DASHBOARD'] },
      { group: 'PARENT', menus: ['DASHBOARD'] },
    ];

    let gmInserted = 0;
    for (const gm of groupModuleMappings) {
      const groupId = groupIds[gm.group];
      if (!groupId) continue;
      for (const menuCode of gm.menus) {
        const menuId = menuIds[menuCode];
        if (!menuId) continue;
        await client.query(
          `INSERT INTO settings.group_modules (group_id, menu_id, created_by) VALUES ($1, $2, $3)`,
          [groupId, menuId, adminId]
        );
        gmInserted++;
      }
    }
    console.log(`Group Modules seeded (${gmInserted} mappings)`);

    // Seed Group Permissions (group + module + permission type).
    // Dashboard is menu-only, so no per-module permissions belong here —
    // dashboard access is governed purely by group_modules.
    const allPermCodes = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT'];
    const groupPermData = [
      // Super Admin: all permissions on all modules
      ...Object.keys(moduleIds).flatMap(modCode =>
        allPermCodes.map(permCode => ({ group: 'SUPER_ADMIN', module: modCode, permission: permCode }))
      ),
      // Admin: no permissions (empty — assign via UI)
      // Principal: view-only on selected settings
      { group: 'PRINCIPAL', module: 'USERS', permission: 'VIEW' },
      { group: 'PRINCIPAL', module: 'ORGANIZATIONS', permission: 'VIEW' },
      // Teacher, Accountant, Student, Parent: dashboard-only by default.
    ];

    let gpInserted = 0;
    for (const gp of groupPermData) {
      const groupId = groupIds[gp.group];
      const modId = moduleIds[gp.module];
      const permId = permissionIds[gp.permission];
      if (!groupId || !modId || !permId) continue;
      await client.query(
        `INSERT INTO settings.group_permissions (group_id, module_id, permission_id, created_by) VALUES ($1, $2, $3, $4)`,
        [groupId, modId, permId, adminId]
      );
      gpInserted++;
    }
    console.log(`Group Permissions seeded (${gpInserted} assignments)`);

    // Seed Employee Categories, Groups and Designations
    const employeeCategories = [
      { name: 'Teaching Staff',     code: 'TEACHING',     description: 'Academic and instructional staff' },
      { name: 'Non-Teaching Staff', code: 'NON_TEACHING', description: 'Administrative and support staff' },
    ];

    const empCategoryIds = {};
    for (const cat of employeeCategories) {
      const existing = await client.query(
        `SELECT id FROM employee.employee_categories WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [cat.code]
      );
      if (existing.rows.length > 0) {
        empCategoryIds[cat.code] = existing.rows[0].id;
        console.log(`  Employee category already exists: ${cat.name}`);
        continue;
      }
      const result = await client.query(
        `INSERT INTO employee.employee_categories (name, code, description, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5) RETURNING id`,
        [cat.name, cat.code, cat.description, adminId, adminId]
      );
      empCategoryIds[cat.code] = result.rows[0].id;
    }
    console.log(`Employee Categories seeded (${Object.keys(empCategoryIds).length} total)`);

    const employeeGroups = [
      { name: 'Primary Teachers',       code: 'PRIMARY_TEACHERS',   category: 'TEACHING',     description: 'Teachers for primary grades' },
      { name: 'Secondary Teachers',     code: 'SECONDARY_TEACHERS', category: 'TEACHING',     description: 'Teachers for secondary grades' },
      { name: 'Administration',         code: 'ADMINISTRATION',     category: 'NON_TEACHING', description: 'Office and admin staff' },
      { name: 'Support & Maintenance',  code: 'SUPPORT',            category: 'NON_TEACHING', description: 'Housekeeping, security and maintenance' },
    ];

    const empGroupIds = {};
    for (const grp of employeeGroups) {
      const existing = await client.query(
        `SELECT id FROM employee.employee_groups WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [grp.code]
      );
      if (existing.rows.length > 0) {
        empGroupIds[grp.code] = existing.rows[0].id;
        console.log(`  Employee group already exists: ${grp.name}`);
        continue;
      }
      const result = await client.query(
        `INSERT INTO employee.employee_groups (name, code, description, employee_category_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING id`,
        [grp.name, grp.code, grp.description, empCategoryIds[grp.category], adminId, adminId]
      );
      empGroupIds[grp.code] = result.rows[0].id;
    }
    console.log(`Employee Groups seeded (${Object.keys(empGroupIds).length} total)`);

    const designations = [
      { name: 'Principal',             code: 'PRINCIPAL',          group: 'ADMINISTRATION',     description: 'Head of the school' },
      { name: 'Vice Principal',        code: 'VICE_PRINCIPAL',     group: 'ADMINISTRATION',     description: 'Deputy head of the school' },
      { name: 'Head of Department',    code: 'HOD',                group: 'SECONDARY_TEACHERS', description: 'Department lead teacher' },
      { name: 'Senior Teacher',        code: 'SR_TEACHER',         group: 'SECONDARY_TEACHERS', description: 'Experienced secondary teacher' },
      { name: 'Teacher',               code: 'TEACHER',            group: 'SECONDARY_TEACHERS', description: 'Secondary grade teacher' },
      { name: 'Primary Teacher',       code: 'PRIMARY_TEACHER',    group: 'PRIMARY_TEACHERS',   description: 'Primary grade teacher' },
      { name: 'Assistant Teacher',     code: 'ASST_TEACHER',       group: 'PRIMARY_TEACHERS',   description: 'Assistant to primary teachers' },
      { name: 'Office Administrator',  code: 'OFFICE_ADMIN',       group: 'ADMINISTRATION',     description: 'Manages office operations' },
      { name: 'Accountant',            code: 'ACCOUNTANT',         group: 'ADMINISTRATION',     description: 'Handles financial records' },
      { name: 'Lab Assistant',         code: 'LAB_ASST',           group: 'SUPPORT',            description: 'Assists in science/computer labs' },
      { name: 'Librarian',             code: 'LIBRARIAN',          group: 'SUPPORT',            description: 'Manages school library' },
      { name: 'Security Guard',        code: 'SECURITY',           group: 'SUPPORT',            description: 'Campus security personnel' },
      { name: 'Housekeeping Staff',    code: 'HOUSEKEEPING',       group: 'SUPPORT',            description: 'Cleaning and maintenance staff' },
    ];

    let desigInserted = 0;
    for (const desig of designations) {
      const existing = await client.query(
        `SELECT id FROM employee.designations WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [desig.code]
      );
      if (existing.rows.length > 0) {
        console.log(`  Designation already exists: ${desig.name}`);
        continue;
      }
      await client.query(
        `INSERT INTO employee.designations (name, code, description, employee_group_id, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, true, $5, $6)`,
        [desig.name, desig.code, desig.description, empGroupIds[desig.group], adminId, adminId]
      );
      desigInserted++;
    }
    console.log(`Designations seeded (${desigInserted} inserted, ${designations.length - desigInserted} already existed)`);

    // Seed Locations
    const orgResult = await client.query("SELECT id FROM settings.organizations WHERE name = 'Shaanthi Matriculation School'");
    const orgId = orgResult.rows[0]?.id;

    if (orgId) {
      // Clear old locations (re-seed) — must delete dependents first
      await client.query('DELETE FROM settings.user_locations');
      await client.query('DELETE FROM academic.academic_years WHERE location_id IN (SELECT id FROM settings.locations WHERE organization_id = $1)', [orgId]);
      await client.query('DELETE FROM master.sequence_controls WHERE location_id IN (SELECT id FROM settings.locations WHERE organization_id = $1)', [orgId]);
      await client.query('DELETE FROM settings.locations WHERE organization_id = $1', [orgId]);

      const locations = [
        { name: 'Main Campus', code: 'MAIN', type: 'main_branch', email: 'main@shaanthi.edu.in', phone: '9876543210' },
        { name: 'East Wing Branch', code: 'EAST', type: 'branch', email: 'east@shaanthi.edu.in', phone: '9876543211' },
        { name: 'Sports Complex', code: 'SPORT', type: 'playground', email: 'sports@shaanthi.edu.in', phone: '9876543212' },
      ];

      const locationIds = {};
      for (const loc of locations) {
        const result = await client.query(
          `INSERT INTO settings.locations (organization_id, name, code, type, email, primary_contact_code, primary_contact_no, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4::settings.location_type, $5, '+91', $6, true, $7, $8) RETURNING id`,
          [orgId, loc.name, loc.code, loc.type, loc.email, loc.phone, adminId, adminId]
        );
        locationIds[loc.code] = result.rows[0].id;
      }
      console.log(`Locations seeded (${Object.keys(locationIds).length} total)`);

      // Map locations to users
      // Super admin & admin: all locations; teacher: Main Campus only
      const userLocationMappings = [
        { username: 'superadmin', locations: ['MAIN', 'EAST', 'SPORT'], default: 'MAIN' },
        { username: 'admin', locations: ['MAIN', 'EAST', 'SPORT'], default: 'MAIN' },
        { username: 'teacher', locations: ['MAIN'], default: 'MAIN' },
      ];

      let ulInserted = 0;
      for (const mapping of userLocationMappings) {
        const userResult = await client.query('SELECT id FROM settings.users WHERE username = $1', [mapping.username]);
        const userId = userResult.rows[0]?.id;
        if (!userId) continue;
        for (const locCode of mapping.locations) {
          const locId = locationIds[locCode];
          if (!locId) continue;
          const isDefault = locCode === mapping.default;
          await client.query(
            'INSERT INTO settings.user_locations (user_id, location_id, is_default, created_by) VALUES ($1, $2, $3, $4)',
            [userId, locId, isDefault, adminId]
          );
          ulInserted++;
        }
      }
      console.log(`User Locations seeded (${ulInserted} mappings)`);

      // Seed Academic Years (previous/current/next) for Main Campus only.
      const mainLocationId = locationIds.MAIN;
      if (mainLocationId) {
        const now = new Date();
        const currentStartYear = (now.getMonth() + 1) >= 6 ? now.getFullYear() : (now.getFullYear() - 1);
        const years = [currentStartYear - 1, currentStartYear, currentStartYear + 1];

        let ayInserted = 0;
        for (const startYear of years) {
          await client.query(
            `INSERT INTO academic.academic_years
               (location_id, academic_year, start_date, end_date, is_default, is_active, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
            [
              mainLocationId,
              `${startYear}-${startYear + 1}`,
              `${startYear}-06-01`,
              `${startYear + 1}-05-31`,
              startYear === currentStartYear,
              adminId,
              adminId,
            ]
          );
          ayInserted++;
        }
        console.log(`Academic Years seeded (${ayInserted} records: previous, current, next)`);
      }

      // Seed Sequence Codes (master list)
      const sequenceCodes = [
        { code: 'EMPLOYEE', name: 'Employee Code Sequence' },
        { code: 'ENQUIRY',  name: 'Enquiry Number Sequence' },
      ];
      const seqCodeIds = {};
      for (const sc of sequenceCodes) {
        const existing = await client.query(
          `SELECT id FROM master.sequence_codes WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
          [sc.code]
        );
        if (existing.rows.length > 0) {
          seqCodeIds[sc.code] = existing.rows[0].id;
          continue;
        }
        const result = await client.query(
          `INSERT INTO master.sequence_codes (code, name, is_active, created_by, updated_by)
           VALUES ($1, $2, true, $3, $4) RETURNING id`,
          [sc.code, sc.name, adminId, adminId]
        );
        seqCodeIds[sc.code] = result.rows[0].id;
      }

      // Seed Sequence Controls — one per location, prefix includes the location code
      // e.g. MAIN-EMP-, EAST-EMP-, SPORT-EMP-  (admin can edit via Master > Sequence Controls)
      let scInserted = 0;
      const seqControlDefs = [
        { code: 'EMPLOYEE', prefixFn: (loc) => `${loc}-EMP-`, digits: 3, max: 9999 },
        { code: 'ENQUIRY',  prefixFn: (loc) => `${loc}-ENQ-`, digits: 4, max: 9999 },
      ];
      for (const locCode of Object.keys(locationIds)) {
        const locId = locationIds[locCode];
        for (const def of seqControlDefs) {
          if (!seqCodeIds[def.code]) continue;
          const existing = await client.query(
            `SELECT id FROM master.sequence_controls WHERE sequence_code_id = $1 AND location_id = $2`,
            [seqCodeIds[def.code], locId]
          );
          if (existing.rows.length > 0) continue;
          await client.query(
            `INSERT INTO master.sequence_controls
               (sequence_code_id, location_id, prefix, suffix, last_no, max_no, digit_length, is_active, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
            [seqCodeIds[def.code], locId, def.prefixFn(locCode), '', 0, def.max, def.digits, adminId, adminId]
          );
          scInserted++;
        }
      }
      console.log(`Sequence Controls seeded (${scInserted} inserted)`);
    }

    // Seed Document Types master data
    const documentTypes = [
      // KYC / Identity — with validation patterns
      { code: 'AADHAAR',         name: 'Aadhaar Card',                  category: 'KYC',        document_no_label: 'Aadhaar Number',  validation_pattern: '^[0-9]{12}$' },
      { code: 'PAN',             name: 'PAN Card',                       category: 'KYC',        document_no_label: 'PAN Number',      validation_pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$' },
      { code: 'PASSPORT',        name: 'Passport',                       category: 'KYC',        document_no_label: 'Passport Number', validation_pattern: '^[A-Z][0-9]{7}$' },
      { code: 'VOTER_ID',        name: 'Voter ID Card',                  category: 'KYC',        document_no_label: 'Voter ID',        validation_pattern: '^[A-Z]{3}[0-9]{7}$' },
      { code: 'DRIVING_LICENCE', name: 'Driving Licence',                category: 'KYC',        document_no_label: 'DL Number',       validation_pattern: null },
      // Educational
      { code: 'MARKSHEET_10',    name: '10th Marksheet',                 category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      { code: 'MARKSHEET_12',    name: '12th Marksheet',                 category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      { code: 'DEGREE_CERT',     name: 'Degree Certificate',             category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      { code: 'TRANSFER_CERT',   name: 'Transfer Certificate',           category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      { code: 'CONDUCT_CERT',    name: 'Conduct Certificate',            category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      { code: 'PROFESSIONAL_CERT', name: 'Professional Certificate',     category: 'EDUCATIONAL', document_no_label: null, validation_pattern: null },
      // Employment
      { code: 'OFFER_LETTER',    name: 'Offer Letter',                   category: 'EMPLOYMENT',  document_no_label: null, validation_pattern: null },
      { code: 'APPOINTMENT_ORDER', name: 'Appointment Order',            category: 'EMPLOYMENT',  document_no_label: null, validation_pattern: null },
      { code: 'EXP_CERT',        name: 'Experience Certificate',         category: 'EMPLOYMENT',  document_no_label: null, validation_pattern: null },
      { code: 'RELIEVING_LETTER', name: 'Relieving Letter',              category: 'EMPLOYMENT',  document_no_label: null, validation_pattern: null },
      { code: 'SALARY_SLIP',     name: 'Salary Slip',                    category: 'EMPLOYMENT',  document_no_label: null, validation_pattern: null },
      // Statutory
      { code: 'EPF_FORM11',      name: 'EPF Form 11 (Declaration)',      category: 'STATUTORY',   document_no_label: null, validation_pattern: null },
      { code: 'ESI_FORM',        name: 'ESI Declaration Form',           category: 'STATUTORY',   document_no_label: null, validation_pattern: null },
      { code: 'NOMINATION_FORM', name: 'Nomination Form',                category: 'STATUTORY',   document_no_label: null, validation_pattern: null },
      // Medical
      { code: 'MEDICAL_FITNESS', name: 'Medical Fitness Certificate',    category: 'MEDICAL',     document_no_label: null, validation_pattern: null },
      { code: 'DISABILITY_CERT', name: 'Disability Certificate',         category: 'MEDICAL',     document_no_label: null, validation_pattern: null },
      // Other
      { code: 'OTHER_DOC',       name: 'Other Document',                 category: 'OTHER',       document_no_label: null, validation_pattern: null },
    ];

    let dtInserted = 0;
    for (const dt of documentTypes) {
      const existing = await client.query(
        `SELECT id FROM master.document_types WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [dt.code]
      );
      if (existing.rows.length > 0) {
        // Update validation fields even for existing rows so patterns are applied on re-seed
        await client.query(
          `UPDATE master.document_types SET document_no_label = $1, validation_pattern = $2
           WHERE LOWER(code) = LOWER($3) AND deleted_at IS NULL`,
          [dt.document_no_label, dt.validation_pattern, dt.code]
        );
        continue;
      }
      await client.query(
        `INSERT INTO master.document_types (code, name, category, is_active, document_no_label, validation_pattern, created_by, updated_by)
         VALUES ($1, $2, $3, true, $4, $5, $6, $7)`,
        [dt.code, dt.name, dt.category, dt.document_no_label, dt.validation_pattern, adminId, adminId]
      );
      dtInserted++;
    }
    console.log(`Document Types seeded (${dtInserted} inserted, ${documentTypes.length - dtInserted} already existed)`);

    // Seed Fee Categories
    const feeCategories = [
      { code: 'TUITION',   name: 'Tuition Fee',      description: 'Regular academic tuition charges' },
      { code: 'TRANSPORT', name: 'Transport Fee',     description: 'School bus and transport charges' },
      { code: 'EXAM',      name: 'Examination Fee',   description: 'Charges for term and annual examinations' },
      { code: 'ACTIVITY',  name: 'Activity Fee',      description: 'Sports, arts and co-curricular activity charges' },
      { code: 'HOSTEL',    name: 'Hostel Fee',        description: 'Boarding and accommodation charges' },
    ];

    let fcInserted = 0;
    for (const fc of feeCategories) {
      const existing = await client.query(
        `SELECT id FROM master.fee_categories WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL`,
        [fc.code]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO master.fee_categories (code, name, description, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, true, $4, $5)`,
          [fc.code, fc.name, fc.description, adminId, adminId]
        );
        fcInserted++;
      }
    }
    console.log(`Fee Categories seeded (${fcInserted} inserted, ${feeCategories.length - fcInserted} already existed)`);

    // Seed Curriculum master data (mirrors SMS curriculum master)
    const curriculums = [
      { name: 'State Board', notes: 'Tamil Nadu State Board curriculum' },
      { name: 'CBSE', notes: 'Central Board of Secondary Education' },
      { name: 'ICSE', notes: 'Indian Certificate of Secondary Education' },
      { name: 'IB', notes: 'International Baccalaureate curriculum' },
      { name: 'IGCSE', notes: 'International General Certificate of Secondary Education' },
    ];

    let curInserted = 0;
    let curUpdated = 0;
    for (const c of curriculums) {
      const existing = await client.query(
        `SELECT id FROM master.curriculum WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
        [c.name]
      );
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE master.curriculum
           SET notes = $1, is_active = true, updated_by = $2, updated_at = NOW()
           WHERE id = $3`,
          [c.notes, adminId, existing.rows[0].id]
        );
        curUpdated++;
        continue;
      }
      await client.query(
        `INSERT INTO master.curriculum (name, notes, is_active, created_by, updated_by)
         VALUES ($1, $2, true, $3, $4)`,
        [c.name, c.notes, adminId, adminId]
      );
      curInserted++;
    }
    console.log(`Curriculum seeded (${curInserted} inserted, ${curUpdated} updated)`);

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
