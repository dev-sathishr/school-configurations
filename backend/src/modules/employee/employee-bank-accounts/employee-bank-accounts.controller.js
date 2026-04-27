const https = require('https');
const svc = require('./employee-bank-accounts.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

async function getAll(req, resp) {
  const result = await svc.getAll(req.params.employeeId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function save(req, resp) {
  const result = await svc.save(req.params.employeeId, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Saved successfully');
}

async function remove(req, resp) {
  const result = await svc.remove(req.params.bankAccountId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Deleted successfully');
}

async function getById(req, resp) {
  const result = await svc.getById(req.params.bankAccountId);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function setActive(req, resp) {
  const result = await svc.setActive(req.params.bankAccountId, req.params.employeeId, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Active account updated');
}

async function lookupIfsc(req, resp) {
  const code = (req.params.ifsc || '').toUpperCase();
  if (!IFSC_RE.test(code)) {
    return res.handleError(resp, { error: 'badRequest', message: 'Invalid IFSC format' });
  }

  const data = await new Promise((resolve) => {
    https.get(`https://ifsc.razorpay.com/${code}`, (r) => {
      let body = '';
      r.on('data', (chunk) => { body += chunk; });
      r.on('end', () => {
        if (r.statusCode === 200) {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });

  if (!data) return res.handleError(resp, { error: 'notFound', message: 'IFSC not found' });
  return res.success(resp, { data });
}

module.exports = wrap({ getAll, getById, save, remove, setActive, lookupIfsc });
