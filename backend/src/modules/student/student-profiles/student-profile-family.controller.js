const svc  = require('../../employee/employee-info/employee-family/relation.service');
const repo = require('../../employee/employee-info/employee-family/relation.repository');
const res  = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');
const { getAddresses } = require('../../../shared/helpers/address.helper');

const ENTITY_TYPE = 'student_profile';

async function getAll(req, resp) {
  const result = await svc.getAll(ENTITY_TYPE, req.params.profileId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.relationId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await svc.create(ENTITY_TYPE, req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Relation saved');
}

async function update(req, resp) {
  const result = await svc.update(req.params.relationId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Relation updated');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.relationId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Relation deleted');
}

async function search(req, resp) {
  // SelectDropdownComponent sends ?search=; also accept ?q= for direct calls
  const q = req.query.search || req.query.q || '';
  const exclude = req.query.exclude_profile_id || null;
  const rows = await repo.search(q, exclude ? 'student_profile' : null, exclude);
  // Attach existing addresses for each relation so the edit modal can pre-populate them
  const rowsWithAddresses = await Promise.all(
    rows.map(async (row) => {
      const addresses = await getAddresses('relation', row.relation_id);
      return { ...row, addresses };
    })
  );
  // Return paginated shape so SelectDropdownComponent works (data array)
  return res.success(resp, { data: rowsWithAddresses });
}

module.exports = wrap({ getAll, getById, create, update, remove, search });
