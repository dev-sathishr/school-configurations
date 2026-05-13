const relationsService = require('./relations.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getRelations(req, resp) {
  const { junctionTable, parentId } = req.params;
  const { parentKey, childKey, sourceTable, extraColumns, displayFields } = req.query;

  if (!parentKey || !childKey || !sourceTable) {
    return res.handleError(resp, { error: 'badRequest', message: 'parentKey, childKey and sourceTable are required' });
  }

  const extras = extraColumns ? JSON.parse(extraColumns) : {};
  const display = displayFields ? JSON.parse(displayFields) : {};

  const result = await relationsService.getRelations(
    junctionTable, parentKey, childKey, parentId, extras, sourceTable, display
  );
  return res.success(resp, { data: result.data });
}

async function saveRelations(req, resp) {
  const { junctionTable, parentId } = req.params;
  const { parentKey, childKey, extraColumns, crossKey, rows: bodyRows } = req.body;
  const rows = bodyRows || req.body.rows || [];

  if (!parentKey || !childKey) {
    return res.handleError(resp, { error: 'badRequest', message: 'parentKey and childKey are required' });
  }

  // Matrix mode: has crossKey
  if (crossKey) {
    await relationsService.saveMatrixRelations(junctionTable, parentKey, childKey, crossKey, parentId, rows, req.user.id);
    return res.success(resp, {}, 'Saved successfully');
  }

  const extras = extraColumns || {};
  await relationsService.saveRelations(junctionTable, parentKey, childKey, parentId, rows, extras, req.user.id);
  return res.success(resp, {}, 'Saved successfully');
}

async function getMatrixRelations(req, resp) {
  const { junctionTable, parentId } = req.params;
  const { parentKey, childKey, crossKey, sourceTable, crossTable, displayFields, crossDisplayFields } = req.query;

  if (!parentKey || !childKey || !crossKey || !sourceTable || !crossTable) {
    return res.handleError(resp, { error: 'badRequest', message: 'parentKey, childKey, crossKey, sourceTable and crossTable are required' });
  }

  const display = displayFields ? JSON.parse(displayFields) : {};
  const crossDisplay = crossDisplayFields ? JSON.parse(crossDisplayFields) : {};

  const result = await relationsService.getMatrixRelations(
    junctionTable, parentKey, childKey, crossKey, parentId, sourceTable, crossTable, display, crossDisplay
  );
  return res.success(resp, result);
}

module.exports = wrap({ getRelations, saveRelations, getMatrixRelations });
