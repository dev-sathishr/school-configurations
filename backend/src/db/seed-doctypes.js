require('dotenv').config();
const { pool } = require('./index');
const ddl = require('../modules/engine/ddl/ddl.runner');

// These slugs point to existing settings.* tables or tab-group parents — no engine DDL needed
const TABLE_OVERRIDES = new Set(['users','groups','locations','permissions','menus','modules','organizations','sequence_codes','sequence_controls','sequence']);

const DOCTYPES = [
  {
    slug: 'groups',
    label: 'Group',
    plural_label: 'Groups',
    icon: 'users',
    description: 'User groups with menu access and permissions',
    is_location_scoped: false,
    fields: [
      { field_name: 'name',             field_label: 'Name',             field_type: 'text',            display_order: 0, col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Group Information',     validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. Super Admin' },
      { field_name: 'code',             field_label: 'Code',             field_type: 'text',            display_order: 1, col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Group Information',     validators: { required: true, min: 2, max: 20, transform: 'uppercase' }, help_text: 'e.g. SUPER_ADMIN' },
      { field_name: 'description',      field_label: 'Description',      field_type: 'textarea',        display_order: 2, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Group Information',     validators: { max: 500 }, help_text: 'Brief description of this group...' },
      { field_name: 'is_active',        field_label: 'Active',           field_type: 'checkbox',        display_order: 3, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                      validators: {}, default_value: 'true' },
      { field_name: 'group_permissions', field_label: 'Menu Access & Permissions', field_type: 'relation-widget', display_order: 4, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Menu Access & Permissions', validators: {}, help_text: 'Select which modules this group can access and set permissions for each',
        select_options: { sourceTable: 'settings.modules', junctionTable: 'settings.group_permissions', parentKey: 'group_id', childKey: 'module_id', crossKey: 'permission_id', crossTable: 'settings.permissions', displayStyle: 'matrix', displayFields: { label: 'name', sub: 'display_name' }, crossDisplayFields: { label: 'name' } } },
    ],
  },
  {
    slug: 'permissions',
    label: 'Permission',
    plural_label: 'Permissions',
    icon: 'shield-check',
    description: 'Permission types like View, Create, Edit, Delete',
    is_location_scoped: false,
    fields: [
      { field_name: 'name',      field_label: 'Name',   field_type: 'text',     display_order: 0, col_span: 6,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Permission Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. View' },
      { field_name: 'code',      field_label: 'Code',   field_type: 'text',     display_order: 1, col_span: 6,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Permission Information', validators: { required: true, min: 2, max: 20, transform: 'uppercase' }, help_text: 'e.g. VIEW' },
      { field_name: 'notes',     field_label: 'Notes',  field_type: 'textarea', display_order: 2, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Details',                validators: { max: 500 }, help_text: 'Any additional notes...' },
      { field_name: 'is_active', field_label: 'Active', field_type: 'checkbox', display_order: 3, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                       validators: {}, default_value: 'true' },
    ],
  },
  {
    slug: 'menus',
    label: 'Menu',
    plural_label: 'Menus',
    icon: 'bookmark',
    description: 'Navigation menus (sidebar groups)',
    is_location_scoped: false,
    fields: [
      { field_name: 'name',           field_label: 'Name',             field_type: 'text',             display_order: 0, col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Menu Information', validators: { required: true, min: 2, max: 100 }, help_text: 'e.g. Settings' },
      { field_name: 'display_name',  field_label: 'Display Name',     field_type: 'text',             display_order: 1, col_span: 4,  is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Menu Information', validators: { required: true, min: 2, max: 100 }, help_text: 'e.g. Settings' },
      { field_name: 'icon',          field_label: 'Icon',             field_type: 'text',             display_order: 2, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Menu Information', validators: { max: 200 }, help_text: 'e.g. cog-6-tooth' },
      { field_name: 'route_path',    field_label: 'Route Path',       field_type: 'text',             display_order: 3, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Navigation',       validators: { max: 200 }, help_text: 'e.g. /settings' },
      { field_name: 'display_order', field_label: 'Display Order',    field_type: 'number',           display_order: 4, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Navigation',       validators: {}, help_text: 'e.g. 1' },
      { field_name: 'parent_id',     field_label: 'Parent Menu',      field_type: 'async-select',     display_order: 5, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Navigation',       validators: {}, ref_doctype_slug: 'menus', help_text: 'Select parent menu (optional)' },
      { field_name: 'description',   field_label: 'Description',      field_type: 'textarea',         display_order: 6, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Details',          validators: { max: 500 }, help_text: 'Brief description of this menu...' },
      { field_name: 'menu_modules',  field_label: 'Assigned Modules', field_type: 'relation-widget',  display_order: 7, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Assigned Modules', validators: {}, help_text: 'Select the modules that belong under this menu',
        select_options: { sourceTable: 'settings.modules', junctionTable: 'settings.menu_modules', parentKey: 'menu_id', childKey: 'module_id', extraColumns: { display_order: 0 }, orderColumn: 'display_order', displayStyle: 'checkbox', displayFields: { label: 'name', sub: 'display_name' } } },
      { field_name: 'is_active',     field_label: 'Active',           field_type: 'checkbox',         display_order: 8, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                 validators: {}, default_value: 'true' },
    ],
  },
  {
    slug: 'modules',
    label: 'Module',
    plural_label: 'Modules',
    icon: 'cube',
    description: 'Application modules / feature pages',
    is_location_scoped: false,
    fields: [
      { field_name: 'name',               field_label: 'Name',              field_type: 'text',     display_order: 0, col_span: 4,  is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Module Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. Users' },
      { field_name: 'display_name',       field_label: 'Display Name',      field_type: 'text',     display_order: 1, col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Module Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. User Management' },
      { field_name: 'icon',               field_label: 'Icon',              field_type: 'text',     display_order: 2, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Module Information', validators: { max: 300 }, help_text: 'e.g. user-group' },
      { field_name: 'route_path',         field_label: 'Route Path',        field_type: 'text',     display_order: 3, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Module Information', validators: { max: 300 }, help_text: 'e.g. /settings/user' },
      { field_name: 'display_order',      field_label: 'Display Order',     field_type: 'number',   display_order: 4, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Module Information', validators: {}, help_text: 'e.g. 1' },
      { field_name: 'description',        field_label: 'Description',       field_type: 'textarea', display_order: 5, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Details',            validators: { max: 500 }, help_text: 'Brief description of this module...' },
      { field_name: 'is_active',          field_label: 'Active',            field_type: 'checkbox', display_order: 6, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                   validators: {}, default_value: 'true' },
      { field_name: 'enforce_edit_lock',  field_label: 'Enforce Edit Lock', field_type: 'checkbox', display_order: 7, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: '',                   validators: {}, help_text: 'When enabled, only one user can edit a record at a time in this module.' },
    ],
  },
  {
    slug: 'organizations',
    label: 'Organization',
    plural_label: 'Organizations',
    icon: 'building-office',
    description: 'Organizations and their details',
    is_location_scoped: false,
    fields: [
      { field_name: 'logo',             field_label: 'Logo',             field_type: 'file',     display_order: 0,  col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Basic Information', validators: {}, select_options: { displayStyle: 'avatar', entityType: 'organization', fileType: 'logo' } },
      { field_name: 'name',             field_label: 'Name',             field_type: 'text',     display_order: 1,  col_span: 6,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. ABC School' },
      { field_name: 'reg_no',           field_label: 'Registration No',  field_type: 'text',     display_order: 2,  col_span: 6,  is_required: false, is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { max: 50 },  help_text: 'e.g. REG-2024-001' },
      { field_name: 'email',            field_label: 'Email',            field_type: 'email',    display_order: 3,  col_span: 6,  is_required: false, is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { max: 100 }, help_text: 'e.g. info@school.com' },
      { field_name: 'primary_phone',    field_label: 'Primary Contact',  field_type: 'phone',    display_order: 4,  col_span: 4,  is_required: true,  is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Contact Details',   validators: { required: true } },
      { field_name: 'alternate_phone',  field_label: 'Alternate Contact',field_type: 'phone',    display_order: 5,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Contact Details',   validators: {} },
      { field_name: 'website',          field_label: 'Website',          field_type: 'url',      display_order: 6,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Contact Details',   validators: { max: 200 }, help_text: 'e.g. https://www.school.com' },
      { field_name: 'social_facebook',  field_label: 'Facebook',         field_type: 'url',      display_order: 7,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Social Media',      validators: { max: 200 }, help_text: 'https://facebook.com/...' },
      { field_name: 'social_instagram', field_label: 'Instagram',        field_type: 'url',      display_order: 8,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Social Media',      validators: { max: 200 }, help_text: 'https://instagram.com/...' },
      { field_name: 'social_twitter',   field_label: 'Twitter / X',      field_type: 'url',      display_order: 9,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Social Media',      validators: { max: 200 }, help_text: 'https://x.com/...' },
      { field_name: 'social_linkedin',  field_label: 'LinkedIn',         field_type: 'url',      display_order: 10, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Social Media',      validators: { max: 200 }, help_text: 'https://linkedin.com/...' },
      { field_name: 'social_youtube',   field_label: 'YouTube',          field_type: 'url',      display_order: 11, col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Social Media',      validators: { max: 200 }, help_text: 'https://youtube.com/...' },
      { field_name: 'addresses',        field_label: 'Addresses',        field_type: 'address',  display_order: 12, col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Addresses',         validators: {} },
      { field_name: 'is_active',        field_label: 'Active',           field_type: 'checkbox', display_order: 13, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Status & Notes',    validators: {}, default_value: 'true' },
      { field_name: 'notes',            field_label: 'Notes',            field_type: 'textarea', display_order: 14, col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Status & Notes',    validators: { max: 500 }, help_text: 'Any additional notes...' },
    ],
  },
  {
    slug: 'locations',
    label: 'Location',
    plural_label: 'Locations',
    icon: 'map-pin',
    description: 'Branches, campuses and locations',
    is_location_scoped: false,
    fields: [
      { field_name: 'organization_id',  field_label: 'Organization',      field_type: 'async-select', display_order: 0,  col_span: 4,  is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { required: true }, ref_doctype_slug: 'organizations', help_text: 'Select Organization' },
      { field_name: 'name',             field_label: 'Name',              field_type: 'text',         display_order: 1,  col_span: 4,  is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. Main Campus' },
      { field_name: 'code',             field_label: 'Code',              field_type: 'text',         display_order: 2,  col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Basic Information', validators: { required: true, min: 3, max: 5, transform: 'uppercase' }, help_text: 'e.g. LOC' },
      { field_name: 'type',             field_label: 'Type',              field_type: 'select',       display_order: 3,  col_span: 4,  is_required: true,  is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Basic Information', validators: { required: true },
        select_options: [
          { value: 'main_branch', label: 'Main Branch' },
          { value: 'branch',      label: 'Branch' },
          { value: 'campus',      label: 'Campus' },
          { value: 'annexure',    label: 'Annexure' },
          { value: 'hostel',      label: 'Hostel' },
          { value: 'other',       label: 'Other' },
        ]
      },
      { field_name: 'email',            field_label: 'Email',             field_type: 'email',        display_order: 4,  col_span: 4,  is_required: false, is_unique: true,  is_searchable: true,  show_in_list: false, section_name: 'Basic Information', validators: { max: 100 }, help_text: 'e.g. campus@school.com' },
      { field_name: 'primary_phone',    field_label: 'Primary Contact',   field_type: 'phone',        display_order: 5,  col_span: 6,  is_required: true,  is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Contact Details',   validators: { required: true }, help_text: 'Phone number' },
      { field_name: 'alternate_phone',  field_label: 'Alternate Contact', field_type: 'phone',        display_order: 6,  col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Contact Details',   validators: {}, help_text: 'Phone number' },
      { field_name: 'addresses',        field_label: 'Addresses',         field_type: 'address',      display_order: 7,  col_span: 12, is_required: true,  is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Addresses',         validators: { required: true },
        select_options: { addressTypes: ['primary', 'branch', 'other'] }
      },
      { field_name: 'is_active',        field_label: 'Active',            field_type: 'checkbox',     display_order: 8,  col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Status & Notes',    validators: {}, default_value: 'true' },
      { field_name: 'notes',            field_label: 'Notes',             field_type: 'textarea',     display_order: 9,  col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Status & Notes',    validators: { max: 500 }, help_text: 'Any additional notes...' },
    ],
  },
  {
    slug: 'sequence',
    label: 'Sequence Master',
    plural_label: 'Sequence Master',
    icon: 'adjustments-horizontal',
    description: 'Auto-numbering sequence codes and per-location controls',
    is_location_scoped: false,
    display_mode: 'tab-group',
    tab_children: ['sequence_codes', 'sequence_controls'],
    fields: [],
  },
  {
    slug: 'sequence_codes',
    label: 'Sequence Code',
    plural_label: 'Sequence Codes',
    icon: 'adjustments-horizontal',
    description: 'Master list of auto-numbering sequence types',
    is_location_scoped: false,
    display_mode: 'modal',
    schema_name: 'master',
    fields: [
      { field_name: 'code',      field_label: 'Code',   field_type: 'text',     display_order: 0, col_span: 6, is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Sequence Information', validators: { required: true, min: 3, max: 20, transform: 'uppercase' }, help_text: 'e.g. EMPLOYEE' },
      { field_name: 'name',      field_label: 'Name',   field_type: 'text',     display_order: 1, col_span: 6, is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Sequence Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. Employee Code Sequence' },
      { field_name: 'is_active', field_label: 'Active', field_type: 'checkbox', display_order: 2, col_span: 6, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                     validators: {}, default_value: 'true' },
    ],
  },
  {
    slug: 'sequence_controls',
    label: 'Sequence Control',
    plural_label: 'Sequence Controls',
    icon: 'adjustments-horizontal',
    description: 'Per-location prefix, suffix, counter and limit for each sequence type',
    is_location_scoped: true,
    display_mode: 'modal',
    schema_name: 'master',
    fields: [
      { field_name: 'sequence_code_id', field_label: 'Sequence Code',  field_type: 'async-select', display_order: 0, col_span: 6, is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Sequence Configuration', validators: { required: true }, ref_doctype_slug: 'sequence_codes', help_text: 'Select sequence type' },
      { field_name: 'location_id',      field_label: 'Location',        field_type: 'async-select', display_order: 1, col_span: 6, is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Sequence Configuration', validators: { required: true }, ref_doctype_slug: 'locations',       help_text: 'Select location' },
      { field_name: 'prefix',           field_label: 'Prefix',          field_type: 'text',         display_order: 2, col_span: 4, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Sequence Configuration', validators: { max: 20 },              help_text: 'e.g. MAIN-EMP-' },
      { field_name: 'suffix',           field_label: 'Suffix',          field_type: 'text',         display_order: 3, col_span: 4, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Sequence Configuration', validators: { max: 20 },              help_text: 'e.g. -A' },
      { field_name: 'digit_length',     field_label: 'Digit Length',    field_type: 'number',       display_order: 4, col_span: 4, is_required: true,  is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Sequence Configuration', validators: { required: true, min: 1, max: 10 }, help_text: 'Padding length e.g. 3 → 001', default_value: '3' },
      { field_name: 'last_no',          field_label: 'Last Number',     field_type: 'number',       display_order: 5, col_span: 6, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Counter',                validators: {},                       help_text: 'Current counter value', default_value: '0' },
      { field_name: 'max_no',           field_label: 'Max Number',      field_type: 'number',       display_order: 6, col_span: 6, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Counter',                validators: {},                       help_text: 'Maximum allowed counter', default_value: '9999' },
      { field_name: 'is_active',        field_label: 'Active',          field_type: 'checkbox',     display_order: 7, col_span: 6, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                       validators: {}, default_value: 'true' },
      { field_name: 'notes',            field_label: 'Notes',           field_type: 'textarea',     display_order: 8, col_span: 6, is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: '',                       validators: { max: 500 },             help_text: 'Any additional notes...' },
    ],
  },
  {
    slug: 'users',
    label: 'User',
    plural_label: 'Users',
    icon: 'user',
    description: 'System users',
    is_location_scoped: false,
    fields: [
      // ── Account Information ─────────────────────────────────────────
      { field_name: 'profile_image', field_label: 'Profile Photo',  field_type: 'file',     display_order: 0,  col_span: 12, is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Account Information', validators: {},                              select_options: { displayStyle: 'photo', entityType: 'user', fileType: 'profile_image' } },
      { field_name: 'person_type',   field_label: 'User Type',      field_type: 'select',   display_order: 1,  col_span: 6,  is_required: true,  is_unique: false, is_searchable: false, show_in_list: true,  section_name: 'Account Information', validators: { required: true },              select_options: [{ value: 'staff', label: 'Staff' }, { value: 'employee', label: 'Employee' }, { value: 'student', label: 'Student' }, { value: 'parent', label: 'Parent' }], default_value: 'staff' },
      { field_name: 'username',      field_label: 'Username',       field_type: 'text',     display_order: 2,  col_span: 6,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Account Information', validators: { required: true, min: 3, max: 50 }, help_text: 'e.g. john_doe' },
      { field_name: 'password',      field_label: 'Password',       field_type: 'password', display_order: 3,  col_span: 6,  is_required: true,  is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Account Information', validators: { required: true, min: 6 },       help_text: 'Enter password' },
      { field_name: 'group_id',      field_label: 'Group',          field_type: 'async-select', display_order: 4, col_span: 6, is_required: true, is_unique: false, is_searchable: false, show_in_list: true, section_name: 'Account Information', validators: { required: true },             ref_doctype_slug: 'groups', help_text: 'Select group' },
      // ── Personal Information ────────────────────────────────────────
      { field_name: 'full_name',     field_label: 'Full Name',      field_type: 'text',     display_order: 5,  col_span: 4,  is_required: true,  is_unique: false, is_searchable: true,  show_in_list: true,  section_name: 'Personal Information', validators: { required: true, min: 3, max: 100 }, help_text: 'e.g. John Doe' },
      { field_name: 'email',         field_label: 'Email',          field_type: 'email',    display_order: 6,  col_span: 4,  is_required: true,  is_unique: true,  is_searchable: true,  show_in_list: true,  section_name: 'Personal Information', validators: { required: true, max: 100 },     help_text: 'e.g. john@example.com' },
      { field_name: 'phone',         field_label: 'Phone',          field_type: 'phone',    display_order: 7,  col_span: 4,  is_required: false, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Personal Information', validators: {} },
      // ── Location Access (relation-widget) ───────────────────────────
      { field_name: 'user_locations', field_label: 'Location Access', field_type: 'relation-widget', display_order: 8, col_span: 12, is_required: true, is_unique: false, is_searchable: false, show_in_list: false, section_name: 'Location Access', validators: { required: true }, select_options: { sourceTable: 'settings.locations', junctionTable: 'settings.user_locations', parentKey: 'user_id', childKey: 'location_id', extraColumns: { is_default: true }, displayStyle: 'checkbox', displayFields: { label: 'name', sub: 'code' } } },
      // ── Status ──────────────────────────────────────────────────────
      { field_name: 'is_active',     field_label: 'Active',         field_type: 'checkbox', display_order: 9,  col_span: 6,  is_required: false, is_unique: false, is_searchable: false, show_in_list: true,  section_name: '',                     validators: {}, default_value: 'true' },
    ],
  },
];

async function seedDoctypes() {
  const client = await pool.connect();
  try {
    // Ensure field_type check constraint includes all current types
    await client.query(`
      ALTER TABLE engine.doctype_fields
        DROP CONSTRAINT IF EXISTS doctype_fields_field_type_check
    `);
    await client.query(`
      ALTER TABLE engine.doctype_fields
        ADD CONSTRAINT doctype_fields_field_type_check
        CHECK (field_type IN (
          'text','email','url','number','date',
          'select','async-select','textarea','checkbox','phone','password','file','address','relation-widget'
        ))
    `);

    const adminRes = await client.query(`SELECT id FROM settings.users WHERE username = 'superadmin' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id;
    if (!adminId) { console.error('superadmin not found — run seed.js first'); return; }

    for (const dt of DOCTYPES) {
      // Check if already exists
      const existing = await client.query(
        `SELECT id FROM engine.doctypes WHERE slug = $1 AND deleted_at IS NULL`, [dt.slug]
      );

      let doctypeId;

      const displayMode = dt.display_mode || 'page';
      const tabChildren = dt.tab_children ? JSON.stringify(dt.tab_children) : null;
      const schemaName  = dt.schema_name  || 'engine';

      if (existing.rows.length > 0) {
        doctypeId = existing.rows[0].id;
        console.log(`DocType "${dt.slug}" already exists — updating fields`);
        await client.query(
          `UPDATE engine.doctypes SET label=$1, plural_label=$2, description=$3,
           is_location_scoped=$4, display_mode=$5, tab_children=$6, schema_name=$7,
           updated_by=$8, updated_at=NOW(), meta_version=meta_version+1
           WHERE id=$9`,
          [dt.label, dt.plural_label, dt.description, dt.is_location_scoped,
           displayMode, tabChildren, schemaName, adminId, doctypeId]
        );
        // Soft-delete existing fields so we can re-upsert cleanly
        await client.query(
          `UPDATE engine.doctype_fields SET deleted_at=NOW(), deleted_by=$1 WHERE doctype_id=$2 AND deleted_at IS NULL`,
          [adminId, doctypeId]
        );
      } else {
        const res = await client.query(
          `INSERT INTO engine.doctypes
             (slug, label, plural_label, icon, description, is_location_scoped, display_mode, tab_children,
              schema_name, auto_create_table, table_status, is_active, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'pending',true,$10,$10) RETURNING id`,
          [dt.slug, dt.label, dt.plural_label, dt.icon || null, dt.description || null,
           dt.is_location_scoped, displayMode, tabChildren, schemaName, adminId]
        );
        doctypeId = res.rows[0].id;
        console.log(`DocType "${dt.slug}" created`);
      }

      // Upsert fields
      for (let i = 0; i < dt.fields.length; i++) {
        const f = dt.fields[i];
        const validators = f.validators ?? (f.is_required ? { required: true } : {});
        const selectOptions = f.select_options ? JSON.stringify(f.select_options) : null;
        const helpText = f.help_text || null;
        const defaultValue = f.default_value || null;
        await client.query(
          `INSERT INTO engine.doctype_fields
             (doctype_id, field_name, field_label, field_type, display_order, col_span, section_name,
              validators, is_unique, is_searchable, is_filterable, is_readonly, is_hidden,
              show_in_list, help_text, select_options, ref_doctype_slug, default_value, is_active, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,false,false,$11,$12,$13,$14,$15,true,$16,$16)
           ON CONFLICT (doctype_id, field_name) DO UPDATE SET
             field_label=$3, field_type=$4, display_order=$5, col_span=$6, section_name=$7,
             validators=$8, is_unique=$9, is_searchable=$10, show_in_list=$11,
             help_text=$12, select_options=$13, ref_doctype_slug=$14, default_value=$15,
             updated_by=$16, updated_at=NOW(), deleted_at=NULL, deleted_by=NULL`,
          [doctypeId, f.field_name, f.field_label, f.field_type, f.display_order,
           f.col_span ?? 6,
           f.section_name || null, JSON.stringify(validators),
           f.is_unique, f.is_searchable, f.show_in_list,
           helpText, selectOptions, f.ref_doctype_slug || null, defaultValue, adminId]
        );
      }

      // Skip DDL for slugs that map to existing settings.* tables
      if (TABLE_OVERRIDES.has(dt.slug)) {
        await client.query(`UPDATE engine.doctypes SET table_status='active' WHERE id=$1`, [doctypeId]);
        console.log(`  Table settings."${dt.slug}" → active (existing table, no DDL needed)`);
        continue;
      }

      // Run DDL for engine-managed tables
      const doctypeWithFields = await client.query(
        `SELECT d.*, json_agg(f ORDER BY f.display_order) AS fields
         FROM engine.doctypes d
         LEFT JOIN engine.doctype_fields f ON f.doctype_id = d.id AND f.deleted_at IS NULL
         WHERE d.id = $1 GROUP BY d.id`, [doctypeId]
      );
      const docObj = doctypeWithFields.rows[0];
      docObj.fields = docObj.fields?.filter(f => f) || [];

      const ddlResult = await ddl.ensureTable(docObj);
      const status = ddlResult.ok ? 'active' : 'error';
      await client.query(
        `UPDATE engine.doctypes SET table_status=$1, last_error=$2 WHERE id=$3`,
        [status, ddlResult.error || null, doctypeId]
      );
      const schema = docObj.schema_name || 'engine';
      console.log(`  Table ${schema}."${dt.slug}" → ${status}${ddlResult.error ? ': ' + ddlResult.error : ''}`);
    }

    // Fix any stale created_by/updated_by in engine-managed data tables (skip overrides)
    for (const dt of DOCTYPES) {
      if (TABLE_OVERRIDES.has(dt.slug)) continue;
      const schema = dt.schema_name || 'engine';
      try {
        await client.query(
          `UPDATE "${schema}"."${dt.slug}" SET created_by = $1 WHERE created_by IS NULL OR created_by NOT IN (SELECT id FROM settings.users)`,
          [adminId]
        );
        await client.query(
          `UPDATE "${schema}"."${dt.slug}" SET updated_by = $1 WHERE updated_by IS NULL OR updated_by NOT IN (SELECT id FROM settings.users)`,
          [adminId]
        );
      } catch (_) { /* table may not exist yet — ignore */ }
    }

    console.log('\nAll DocTypes seeded successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    client.release();
    // Only end the pool when running standalone, not when called from seed.js
    if (require.main === module) await pool.end();
  }
}

async function run() {
  await seedDoctypes();
}

// Allow running standalone: node seed-doctypes.js
if (require.main === module) run();

module.exports = { run };
