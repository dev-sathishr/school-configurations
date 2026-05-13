const cache = new Map();
const TTL = 5 * 60 * 1000;

module.exports = {
  get(slug) {
    const entry = cache.get(slug);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { cache.delete(slug); return null; }
    return entry.data;
  },
  set(slug, data) {
    cache.set(slug, { data, expiresAt: Date.now() + TTL });
  },
  invalidate(slug) {
    cache.delete(slug);
  },
  invalidateAll() {
    cache.clear();
  },
};
