const service = require('./permission-request.service');
const res = require('../../shared/helpers/response.helper');

async function createRequest(req, resp) {
  try {
    const result = await service.createRequest(req.user.id, req.body.message);
    if (result.error === 'conflict') return res.conflict(resp, result.message);
    return res.created(resp, { request: result.data }, 'Permission request submitted');
  } catch (err) {
    console.error('Create permission request error:', err);
    return res.error(resp);
  }
}

async function getPendingRequest(req, resp) {
  try {
    const result = await service.getPendingRequest(req.user.id);
    return res.success(resp, { request: result.data });
  } catch (err) {
    console.error('Get pending request error:', err);
    return res.error(resp);
  }
}

module.exports = { createRequest, getPendingRequest };
