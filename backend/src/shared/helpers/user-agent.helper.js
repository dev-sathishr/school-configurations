const { UAParser } = require('ua-parser-js');

/**
 * Parse a raw `User-Agent` string into readable device + browser info.
 * Returns flat fields suitable for lateral inclusion in API responses.
 *
 * Falls back to the raw string when parsing yields nothing useful, so a
 * session row always has *something* visible.
 */
function parseUserAgent(ua) {
  if (!ua) return { browser: null, os: null, device_type: null, ua_summary: null };

  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserLabel = browser.name ? `${browser.name}${browser.version ? ' ' + browser.version.split('.')[0] : ''}` : null;
  const osLabel = os.name ? `${os.name}${os.version ? ' ' + os.version : ''}` : null;
  // ua-parser uses '' for desktop; normalize to a useful label.
  const deviceType = device.type || 'desktop';
  const summary = [browserLabel, osLabel].filter(Boolean).join(' · ') || null;

  return {
    browser: browserLabel,
    os: osLabel,
    device_type: deviceType,
    ua_summary: summary,
  };
}

module.exports = { parseUserAgent };
