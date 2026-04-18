const repo = require('./preferences.repository');

const DEFAULTS = {
  appearance: { menu: 'sidebar', mode: 'light', direction: 'ltr', color: 'base' },
  tables: { defaultPageSize: 10, perTable: {} },
  favorites: { modules: [], pinnedMenus: [] },
  usage: { menus: {}, modules: {} },
};

const ALLOWED_TOP_KEYS = new Set(['appearance', 'tables', 'favorites', 'usage']);
const ALLOWED_TRACK_TYPES = new Set(['menu', 'module']);

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

function mergeWithDefaults(data) {
  return deepMerge(DEFAULTS, data || {});
}

function stripUnknownTopKeys(patch) {
  const out = {};
  for (const key of Object.keys(patch || {})) {
    if (ALLOWED_TOP_KEYS.has(key)) out[key] = patch[key];
  }
  return out;
}

async function getForUser(userId) {
  const row = await repo.findByUserId(userId);
  return mergeWithDefaults(row ? row.data : {});
}

async function patchForUser(userId, rawPatch) {
  const patch = stripUnknownTopKeys(rawPatch);
  const existing = await repo.findByUserId(userId);
  const current = existing ? existing.data : {};

  let merged = deepMerge(current, patch);

  // tables.perTable is replaced wholesale when provided in the patch,
  // so clients can delete individual keys by sending a new map.
  if (patch.tables && Object.prototype.hasOwnProperty.call(patch.tables, 'perTable')) {
    merged = {
      ...merged,
      tables: {
        ...(merged.tables || {}),
        perTable: isPlainObject(patch.tables.perTable) ? patch.tables.perTable : {},
      },
    };
  }

  await repo.upsert(userId, merged);
  return mergeWithDefaults(merged);
}

async function track(userId, type, id) {
  if (!ALLOWED_TRACK_TYPES.has(type)) {
    return { error: 'badRequest', message: 'type must be "menu" or "module"' };
  }
  if (!id || typeof id !== 'string') {
    return { error: 'badRequest', message: 'id is required' };
  }
  const bucket = type === 'menu' ? 'menus' : 'modules';
  await repo.trackIncrement(userId, bucket, id);
  return { ok: true };
}

module.exports = { getForUser, patchForUser, track, DEFAULTS };
