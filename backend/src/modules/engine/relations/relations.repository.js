const db = require('../../../config/database');

const ALLOWED_TABLES = new Set([
  'settings.user_locations',
  'settings.group_menus',
  'settings.menu_modules',
  'settings.group_permissions',
]);

function assertAllowed(junctionTable) {
  if (!ALLOWED_TABLES.has(junctionTable)) {
    throw Object.assign(new Error(`Junction table "${junctionTable}" is not permitted`), { statusCode: 400 });
  }
}

async function getRelations(junctionTable, parentKey, childKey, parentId, extraColumns) {
  assertAllowed(junctionTable);
  const extras = Object.keys(extraColumns || {});
  const extraSelect = extras.length ? ', ' + extras.map(c => `"${c}"`).join(', ') : '';
  const result = await db.query(
    `SELECT "${childKey}"${extraSelect} FROM ${junctionTable} WHERE "${parentKey}" = $1`,
    [parentId]
  );
  return result.rows;
}

async function saveRelations(junctionTable, parentKey, childKey, parentId, rows, extraColumns, userId) {
  assertAllowed(junctionTable);
  await db.query(`DELETE FROM ${junctionTable} WHERE "${parentKey}" = $1`, [parentId]);
  if (!rows || rows.length === 0) return;

  const extras = Object.keys(extraColumns || {});
  const extraCols = extras.length ? ', ' + extras.map(c => `"${c}"`).join(', ') + ', created_by' : ', created_by';
  const colList = `"${parentKey}", "${childKey}"${extraCols}`;

  for (const row of rows) {
    const vals = [parentId, row[childKey]];
    const extraVals = extras.map(c => row[c] ?? extraColumns[c] ?? null);
    const allVals = [...vals, ...extraVals, userId];
    const placeholders = allVals.map((_, i) => `$${i + 1}`).join(', ');
    await db.query(
      `INSERT INTO ${junctionTable} (${colList}) VALUES (${placeholders})`,
      allVals
    );
  }
}

async function getSourceRows(sourceTable, displayFields) {
  const labelCol = displayFields?.label || 'name';
  const subCol = displayFields?.sub || null;
  const subSelect = subCol ? `, "${subCol}" AS sub` : `, '' AS sub`;
  const result = await db.query(
    `SELECT id, "${labelCol}" AS label${subSelect}
     FROM ${sourceTable}
     WHERE deleted_at IS NULL AND is_active = true
     ORDER BY "${labelCol}"`
  );
  return result.rows;
}

// Matrix mode: modules grouped by menu × permission columns
// Returns { groups: [{menuId, menuLabel, menuCode, rows: [{id, label, sub, permissions}]}], crossItems: [{id, label}] }
async function getMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, sourceTable, crossTable, displayFields, crossDisplayFields) {
  assertAllowed(junctionTable);
  const labelCol = displayFields?.label || 'name';
  const subCol = displayFields?.sub || null;
  const crossLabelCol = crossDisplayFields?.label || 'name';
  const subSelect = subCol ? `, m."${subCol}" AS sub` : `, '' AS sub`;

  // Fetch modules joined to menus via menu_modules, ordered by menu then module
  const sourceRes = await db.query(
    `SELECT m.id, m."${labelCol}" AS label${subSelect},
            mn.id AS menu_id, mn.name AS menu_label, mn.display_order AS menu_display_order
     FROM ${sourceTable} m
     JOIN settings.menu_modules mm ON mm.module_id = m.id AND mm.deleted_at IS NULL
     JOIN settings.menus mn ON mn.id = mm.menu_id AND mn.deleted_at IS NULL
     WHERE m.deleted_at IS NULL AND m.is_active = true
     ORDER BY mn.display_order, mn.name, mm.display_order, m."${labelCol}"`
  );

  const [crossRes] = await Promise.all([
    db.query(`SELECT id, "${crossLabelCol}" AS label FROM ${crossTable} WHERE deleted_at IS NULL AND is_active = true ORDER BY "${crossLabelCol}"`),
  ]);

  const isNew = !parentId || parentId === '__new__';
  const selected = new Set();
  if (!isNew) {
    const jRes = await db.query(
      `SELECT "${childKey}", "${crossKey}" FROM ${junctionTable} WHERE "${parentKey}" = $1`,
      [parentId]
    );
    jRes.rows.forEach(r => selected.add(`${r[childKey]}::${r[crossKey]}`));
  }

  // Group by menu
  const menuMap = new Map();
  for (const src of sourceRes.rows) {
    if (!menuMap.has(src.menu_id)) {
      menuMap.set(src.menu_id, { menuId: src.menu_id, menuLabel: src.menu_label, menuCode: src.menu_label, rows: [] });
    }
    const perms = {};
    for (const cross of crossRes.rows) {
      perms[cross.id] = selected.has(`${src.id}::${cross.id}`);
    }
    menuMap.get(src.menu_id).rows.push({ id: src.id, label: src.label, sub: src.sub, permissions: perms });
  }

  return { groups: Array.from(menuMap.values()), crossItems: crossRes.rows };
}

async function saveMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, rows, userId) {
  assertAllowed(junctionTable);
  await db.query(`DELETE FROM ${junctionTable} WHERE "${parentKey}" = $1`, [parentId]);
  for (const row of rows) {
    for (const [crossId, checked] of Object.entries(row.permissions || {})) {
      if (!checked) continue;
      await db.query(
        `INSERT INTO ${junctionTable} ("${parentKey}", "${childKey}", "${crossKey}", created_by) VALUES ($1, $2, $3, $4)`,
        [parentId, row.id, crossId, userId]
      );
    }
  }
}

module.exports = { getRelations, saveRelations, getSourceRows, getMatrixRelations, saveMatrixRelations };
