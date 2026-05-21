const workflowRepo = require('./workflow.repository');
const metaService  = require('../meta/meta.service');

async function getDoctype(slug) {
  const result = await metaService.getDoctypeBySlug(slug);
  return result.data ?? null;
}

async function getWorkflow(slug) {
  const wf = await workflowRepo.findBySlug(slug);
  return { data: wf };   // null means no workflow configured
}

async function saveWorkflow(slug, body, userId) {
  const { states, transitions, is_active } = body;
  if (!Array.isArray(states) || states.length === 0)
    return { error: 'badRequest', message: 'At least one state is required' };

  const initialStates = states.filter(s => s.is_initial);
  if (initialStates.length !== 1)
    return { error: 'badRequest', message: 'Exactly one state must be marked as initial' };

  for (const t of (transitions || [])) {
    if (!t.from_state || !t.to_state || !t.action_label)
      return { error: 'badRequest', message: 'Each transition needs from_state, to_state and action_label' };
  }

  const id = await workflowRepo.upsert(slug, { states, transitions, is_active }, userId);
  const wf = await workflowRepo.findById(id);
  return { data: wf };
}

async function deleteWorkflow(slug, userId) {
  await workflowRepo.softDelete(slug, userId);
  return { data: null };
}

async function transition(slug, recordId, actionLabel, userId, userGroupCode) {
  const doc = await getDoctype(slug);
  if (!doc) return { error: 'notFound', message: `DocType "${slug}" not found` };

  const wf = await workflowRepo.findBySlug(slug);
  if (!wf || !wf.is_active) return { error: 'badRequest', message: 'No active workflow for this DocType' };

  const schemaName = doc.schema_name || 'engine';
  const currentState = await workflowRepo.getRecordState(schemaName, slug, recordId);

  // Find matching transitions from current state with the given action
  const matchingTransitions = wf.transitions.filter(t =>
    t.from_state === currentState && t.action_label === actionLabel
  );

  if (matchingTransitions.length === 0)
    return { error: 'badRequest', message: `Action "${actionLabel}" is not valid from state "${currentState || 'initial'}"` };

  const trans = matchingTransitions[0];

  // Check role permission
  if (trans.allowed_roles && trans.allowed_roles.length > 0) {
    if (!trans.allowed_roles.includes(userGroupCode)) {
      return { error: 'forbidden', message: `Your role is not allowed to perform "${actionLabel}"` };
    }
  }

  await workflowRepo.applyTransition(schemaName, slug, recordId, trans.to_state, userId);
  return { data: { workflow_state: trans.to_state } };
}

// Returns available actions for a record given current user's group
async function getAvailableActions(slug, recordId, userGroupCode) {
  const doc = await getDoctype(slug);
  if (!doc) return { data: [] };

  const wf = await workflowRepo.findBySlug(slug);
  if (!wf || !wf.is_active) return { data: [] };

  const schemaName = doc.schema_name || 'engine';
  const currentState = await workflowRepo.getRecordState(schemaName, slug, recordId);

  const actions = wf.transitions
    .filter(t => t.from_state === currentState)
    .filter(t => !t.allowed_roles?.length || t.allowed_roles.includes(userGroupCode))
    .map(t => ({ action_label: t.action_label, to_state: t.to_state }));

  return { data: { current_state: currentState, actions } };
}

module.exports = { getWorkflow, saveWorkflow, deleteWorkflow, transition, getAvailableActions };
