const userRepo = require('../../modules/settings/users/user.repository');

/**
 * Location-scoping primitives shared across every location-aware module.
 *
 * Model:
 *   - A user has a set of "permitted" location IDs (via settings.user_locations).
 *   - If no rows exist for the user, scope is `null` ⇒ unrestricted (e.g. super admin).
 *   - The UI may additionally "request" a narrower subset via the header multiselect.
 *   - Effective scope = intersect(permitted, requested). `null` on either side means
 *     "no restriction on that side"; `[]` means "explicit nothing".
 *
 * Usage in a list repository:
 *
 *   const loc = applyLocationScope({ column: 'x.location_id', scope, requested: query.location_ids });
 *   if (loc.empty) return emptyPage();
 *   if (loc.clause) { clauses.push(loc.clause); params.push(...loc.params); }
 *
 * Usage in a service (create/update/getById/remove):
 *
 *   const scope = await getUserLocationScope(userId);
 *   const err = assertLocationAllowed(scope, body.location_id);
 *   if (err) return err;
 */

/** Permitted IDs for the user, or null when unrestricted. */
async function getUserLocationScope(userId) {
  const rows = await userRepo.getUserLocations(userId);
  if (!rows.length) return null;
  return rows.map((r) => r.id);
}

/**
 * Parse a `location_ids` query param. Special-cases the `__none__` sentinel
 * the header multiselect sends when the user has deselected everything — without
 * it, an empty string would collapse to "no filter" and silently show all data.
 */
function parseIds(value) {
  if (!value) return null;
  if (value === '__none__') return [];
  const ids = String(value).split(',').map((v) => v.trim()).filter(Boolean);
  return ids.length > 0 ? ids : null;
}

/** Intersection where `null` on either side means "no constraint on that side". */
function intersectScope(scope, requested) {
  if (!scope && !requested) return null;
  if (!scope) return requested;
  if (!requested) return scope;
  const set = new Set(scope);
  return requested.filter((id) => set.has(id));
}

/**
 * Build a SQL clause for a list repository's paginate() call.
 * Returns `{ clause, params, empty }`:
 *   - `empty: true`  ⇒ caller should short-circuit and return zero rows
 *   - `clause: ''`   ⇒ no restriction, skip the AND
 *   - otherwise      ⇒ push `clause` + `...params` into the paginate extras
 */
function applyLocationScope({ column, scope, requested }) {
  const parsedReq = typeof requested === 'string' ? parseIds(requested) : requested;
  const effective = intersectScope(scope, parsedReq);
  if (effective === null) return { clause: '', params: [], empty: false };
  if (effective.length === 0) return { clause: '', params: [], empty: true };
  const placeholders = effective.map(() => '?').join(', ');
  return { clause: `${column} IN (${placeholders})`, params: effective, empty: false };
}

/** Guard for create/update where the incoming location_id must be in scope. */
function assertLocationAllowed(scope, locationId) {
  if (!locationId) return null;
  if (!scope) return null;
  if (!scope.includes(locationId)) {
    return { error: 'forbidden', message: 'You do not have access to the selected location' };
  }
  return null;
}

/**
 * Augment a findById SQL with a location-scope check. Use when a detail-fetch
 * must refuse records the user can't see, so URL-guessing doesn't leak data.
 * Returns `{ extraClause, extraParams, startIndex }` where startIndex is the
 * first placeholder index the caller will need AFTER their existing params.
 */
function scopedFindByIdClause(scope, column, startIndex) {
  if (!scope) return { clause: '', params: [] };
  const placeholders = scope.map((_, i) => `$${startIndex + i}`).join(', ');
  return { clause: `AND ${column} IN (${placeholders})`, params: scope };
}

module.exports = {
  getUserLocationScope,
  parseIds,
  intersectScope,
  applyLocationScope,
  assertLocationAllowed,
  scopedFindByIdClause,
};
