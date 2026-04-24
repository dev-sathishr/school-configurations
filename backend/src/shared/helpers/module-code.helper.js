function normalizeToken(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function singularizeToken(token) {
  const t = normalizeToken(token);
  if (!t) return t;
  if (t.endsWith('IES') && t.length > 3) return `${t.slice(0, -3)}Y`;
  if (t.endsWith('SES') && t.length > 3) return t.slice(0, -2);
  if (t.endsWith('S') && !t.endsWith('SS') && t.length > 1) return t.slice(0, -1);
  return t;
}

function comparableToken(value) {
  return singularizeToken(value);
}

function isTokenMatch(left, right) {
  if (!left || !right) return false;
  return normalizeToken(left) === normalizeToken(right) || comparableToken(left) === comparableToken(right);
}

function words(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => singularizeToken(w));
}

function routeWords(routePath) {
  const clean = String(routePath || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '');
  const segments = clean.split('/').filter(Boolean);
  const tail = segments[segments.length - 1] || '';
  return words(tail);
}

function overlapCount(sourceWords, targetWords) {
  const source = new Set(sourceWords);
  const target = new Set(targetWords);
  let c = 0;
  source.forEach((w) => {
    if (target.has(w)) c += 1;
  });
  return c;
}

function lexicalScore(row, requestedCode) {
  const requested = words(requestedCode);
  if (!requested.length) return 0;

  const candidate = [
    ...words(row?.code),
    ...words(row?.display_name),
    ...words(row?.name),
    ...routeWords(row?.route_path),
  ];
  const overlaps = overlapCount(requested, candidate);
  if (overlaps === 0) return 0;

  const coverage = overlaps / requested.length;
  return 40 + Math.round(coverage * 40) + overlaps;
}

function scoreModuleDescriptorMatch(row, requestedCode) {
  if (!row) return 0;
  if (isTokenMatch(row.code, requestedCode)) return 100;
  if (isTokenMatch(row.display_name, requestedCode)) return 95;
  if (isTokenMatch(row.name, requestedCode)) return 90;
  return lexicalScore(row, requestedCode);
}

function scoreMenuDescriptorMatch(row, requestedCode) {
  if (!row) return 0;
  if (isTokenMatch(row.code, requestedCode)) return 100;
  if (isTokenMatch(row.display_name, requestedCode)) return 95;
  if (isTokenMatch(row.name, requestedCode)) return 90;
  return lexicalScore(row, requestedCode);
}

module.exports = {
  normalizeToken,
  comparableToken,
  isTokenMatch,
  scoreModuleDescriptorMatch,
  scoreMenuDescriptorMatch,
};
