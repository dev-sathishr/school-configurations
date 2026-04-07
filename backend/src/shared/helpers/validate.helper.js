/**
 * Validates fields against rules and returns an array of error messages.
 * Rules: { required, min, max, email, pattern, label }
 */
function validate(data, rules) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const label = rule.label || field;
    const str = value != null ? String(value).trim() : '';

    if (rule.required && !str) {
      errors.push(`${label} is required`);
      continue;
    }

    if (!str) continue; // skip other checks if empty and not required

    if (rule.min && str.length < rule.min) {
      errors.push(`${label} must be at least ${rule.min} characters`);
    }

    if (rule.max && str.length > rule.max) {
      errors.push(`${label} must not exceed ${rule.max} characters`);
    }

    if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors.push(`${label} must be a valid email`);
    }

    if (rule.pattern && !rule.pattern.test(str)) {
      errors.push(`${label} has invalid format`);
    }
  }

  return errors;
}

module.exports = { validate };
