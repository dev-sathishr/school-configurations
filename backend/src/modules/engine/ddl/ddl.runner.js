const db = require('../../../config/database');

// Maps DocType field_type → PostgreSQL column type
const PG_TYPE = {
  'text':         'TEXT',
  'email':        'VARCHAR(200)',
  'url':          'VARCHAR(500)',
  'number':       'NUMERIC',
  'date':         'DATE',
  'select':       'VARCHAR(100)',
  'async-select': 'TEXT',          // stores referenced id as text
  'textarea':     'TEXT',
  'checkbox':     'BOOLEAN DEFAULT false',
  'phone':        'VARCHAR(20)',
  'password':     'VARCHAR(255)',
  'file':         'TEXT',          // stores file id
};

// These field types are handled externally — no DB column created on the parent table
const NO_COLUMN_TYPES = new Set(['address', 'file', 'child-table', 'relation-widget']);

// naming-series stores its value as TEXT in its own column (created via PG_TYPE fallback)
PG_TYPE['naming-series'] = 'VARCHAR(100)';

// Extra columns added after the field columns
const AUDIT_COLS = `
  workflow_state VARCHAR(64),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES settings.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES settings.users(id),
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID REFERENCES settings.users(id)
`;

/**
 * Creates engine."slug" table from doctype field definitions.
 * Safe to call multiple times — uses IF NOT EXISTS.
 * Returns { ok, error }.
 */
async function createTable(doctype) {
  const { slug, fields = [], is_location_scoped, schema_name = 'engine' } = doctype;

  const tableName = `"${schema_name}"."${slug}"`;

  const colDefs = [];

  for (const f of fields.filter(f => f.is_active && !f.deleted_at)) {
    if (NO_COLUMN_TYPES.has(f.field_type)) continue;
    const pgType = PG_TYPE[f.field_type] || 'TEXT';
    const notNull = f.validators?.required ? 'NOT NULL' : '';
    const uniqueConstraint = f.is_unique ? 'UNIQUE' : '';
    // phone fields get a companion _code column
    if (f.field_type === 'phone') {
      colDefs.push(`"${f.field_name}_code" VARCHAR(10) DEFAULT '+91'`);
      colDefs.push(`"${f.field_name}" ${pgType} ${notNull} ${uniqueConstraint}`.trim());
    } else {
      colDefs.push(`"${f.field_name}" ${pgType} ${notNull} ${uniqueConstraint}`.trim());
    }
  }

  if (is_location_scoped) {
    colDefs.push(`location_id UUID REFERENCES settings.locations(id)`);
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ${colDefs.join(',\n      ')},
      ${AUDIT_COLS}
    )
  `;

  try {
    await db.query(sql);

    // Unique indexes for unique fields (partial — excluding deleted rows)
    for (const f of fields.filter(f => f.is_unique && f.is_active && !f.deleted_at)) {
      const idxName = `idx_${slug}_${f.field_name}_unique`;
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "${idxName}"
          ON ${tableName} (LOWER("${f.field_name}"::text))
          WHERE deleted_at IS NULL
      `).catch(() => {}); // ignore if already exists
    }

    return { ok: true };
  } catch (err) {
    console.error(`[DDL] Failed to create table for "${slug}":`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Adds new columns to an existing engine."slug" table when fields are added.
 * Existing columns are never dropped (safe for production data).
 */
async function syncColumns(doctype) {
  const { slug, fields = [], schema_name = 'engine' } = doctype;
  const tableName = `"${schema_name}"."${slug}"`;

  const existing = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
  `, [schema_name, slug]);
  const existingCols = new Set(existing.rows.map(r => r.column_name));

  for (const f of fields.filter(f => f.is_active && !f.deleted_at)) {
    if (NO_COLUMN_TYPES.has(f.field_type)) continue;
    const pgType = PG_TYPE[f.field_type] || 'TEXT';

    if (f.field_type === 'phone') {
      const codeCol = `${f.field_name}_code`;
      if (!existingCols.has(codeCol)) {
        await db.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${codeCol}" VARCHAR(10) DEFAULT '+91'`).catch(() => {});
      }
    }

    if (!existingCols.has(f.field_name)) {
      await db.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${f.field_name}" ${pgType}`).catch(() => {});
    }
  }

  // Ensure workflow_state column exists on older tables
  if (!existingCols.has('workflow_state')) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS workflow_state VARCHAR(64)`).catch(() => {});
  }

  return { ok: true };
}

/**
 * Full sync: create table if missing, add new columns if table exists.
 */
async function ensureTable(doctype) {
  const { slug, schema_name = 'engine' } = doctype;
  const exists = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = $2
  `, [schema_name, slug]);

  if (exists.rows.length === 0) {
    return createTable(doctype);
  } else {
    return syncColumns(doctype);
  }
}

module.exports = { createTable, syncColumns, ensureTable };
