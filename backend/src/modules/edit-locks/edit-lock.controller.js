const lockService = require('./edit-lock.service');
const res = require('../../shared/helpers/response.helper');
const { wrap } = require('../../shared/middleware/async-handler');

async function acquire(req, resp) {
  const result = await lockService.acquireLock(req.user.id, req.body || {});
  if (result.error) return res.handleError(resp, result);
  const message = result.data?.enabled ? 'Edit lock acquired' : 'Edit lock is disabled for this module';
  return res.success(resp, { data: result.data }, message);
}

async function release(req, resp) {
  const result = await lockService.releaseLock(req.user.id, req.body || {});
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Edit lock released');
}

module.exports = wrap({ acquire, release });

