const svc = require('./workflow.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getWorkflow(req, resp) {
  const result = await svc.getWorkflow(req.params.slug);
  return res.success(resp, { data: result.data });
}

async function saveWorkflow(req, resp) {
  const result = await svc.saveWorkflow(req.params.slug, req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Workflow saved');
}

async function deleteWorkflow(req, resp) {
  const result = await svc.deleteWorkflow(req.params.slug, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, {}, 'Workflow deleted');
}

async function getActions(req, resp) {
  const groupCode = req.user.group_code ?? '';
  const result = await svc.getAvailableActions(req.params.slug, req.params.recordId, groupCode);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function doTransition(req, resp) {
  const groupCode = req.user.group_code ?? '';
  const result = await svc.transition(
    req.params.slug, req.params.recordId, req.body.action_label, req.user.id, groupCode
  );
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data }, 'Transition applied');
}

module.exports = wrap({ getWorkflow, saveWorkflow, deleteWorkflow, getActions, doTransition });
