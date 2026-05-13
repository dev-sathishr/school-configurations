const repo = require('./relations.repository');

async function getRelations(junctionTable, parentKey, childKey, parentId, extraColumns, sourceTable, displayFields) {
  const isNew = !parentId || parentId === '__new__';
  const [sourceRows, relationRows] = await Promise.all([
    repo.getSourceRows(sourceTable, displayFields),
    isNew ? Promise.resolve([]) : repo.getRelations(junctionTable, parentKey, childKey, parentId, extraColumns),
  ]);

  const selectedMap = new Map(relationRows.map(r => [r[childKey], r]));

  const items = sourceRows.map(src => {
    const rel = selectedMap.get(src.id);
    const item = { id: src.id, label: src.label, sub: src.sub, selected: !!rel };
    for (const col of Object.keys(extraColumns || {})) {
      const defaultVal = (extraColumns || {})[col] ?? null;
      item[col] = rel ? (rel[col] ?? defaultVal) : defaultVal;
    }
    return item;
  });

  return { data: items };
}

async function saveRelations(junctionTable, parentKey, childKey, parentId, rows, extraColumns, userId) {
  await repo.saveRelations(junctionTable, parentKey, childKey, parentId, rows, extraColumns, userId);
  return {};
}

async function getMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, sourceTable, crossTable, displayFields, crossDisplayFields) {
  return repo.getMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, sourceTable, crossTable, displayFields, crossDisplayFields);
}

async function saveMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, rows, userId) {
  await repo.saveMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, rows, userId);
  return {};
}

module.exports = { getRelations, saveRelations, getMatrixRelations, saveMatrixRelations };
