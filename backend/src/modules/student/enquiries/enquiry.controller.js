const enquiryService = require('./enquiry.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getNextCode(req, resp) {
  const result = await enquiryService.getNextCode(req.params.profileId, req.query.location_id || null, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function getAll(req, resp) {
  const result = await enquiryService.getAll(req.params.profileId, req.query, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, result);
}

async function getById(req, resp) {
  const result = await enquiryService.getById(req.params.profileId, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await enquiryService.create(req.params.profileId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Enquiry created successfully');
}

async function update(req, resp) {
  const result = await enquiryService.update(req.params.profileId, req.params.id, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Enquiry updated successfully');
}

async function remove(req, resp) {
  const result = await enquiryService.remove(req.params.profileId, req.params.id, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Enquiry deleted successfully');
}

async function removeMultiple(req, resp) {
  const result = await enquiryService.removeMultiple(req.params.profileId, req.body.ids, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { deleted_count: result.deleted_count }, `${result.deleted_count} enquiry(s) deleted`);
}

module.exports = wrap({ getAll, getById, getNextCode, create, update, remove, removeMultiple });
