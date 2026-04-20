const service = require('./permission-request.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function createRequest(req, resp) {
  const result = await service.createRequest(req.user.id, req.body.message);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'Permission request submitted');
}

async function getPendingRequest(req, resp) {
  const result = await service.getPendingRequest(req.user.id);
  return res.success(resp, { data: result.data });
}

module.exports = wrap({ createRequest, getPendingRequest });
