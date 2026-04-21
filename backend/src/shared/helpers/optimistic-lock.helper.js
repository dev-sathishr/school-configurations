const CONFLICT_MESSAGE = 'This record was modified by another user. Please refresh and try again.';

function getExpectedUpdatedAt(body) {
  const raw = body?.updated_at;
  if (!raw) {
    return { error: 'badRequest', message: 'Record version is required for update' };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: 'badRequest', message: 'Invalid record version' };
  }

  return { data: parsed.toISOString() };
}

function toConflictIfStale(updatedRow) {
  if (updatedRow) return null;
  return { error: 'conflict', message: CONFLICT_MESSAGE };
}

module.exports = {
  CONFLICT_MESSAGE,
  getExpectedUpdatedAt,
  toConflictIfStale,
};
