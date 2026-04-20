import { Validators, ValidatorFn } from '@angular/forms';

/**
 * Reusable validator presets covering the 80% of cases across our forms.
 * Bundle imports save ~10-20 lines per form and keep rules consistent, so a
 * "name" field always has the same min/max everywhere.
 *
 * Use directly:
 *   name: ['', V.NAME],
 *   notes: ['', V.NOTES],
 *
 * Compose with field-specific extras:
 *   username: ['', [...V.NAME, myCustomValidator]],
 *
 * Reach for the factories (V.maxLength, V.requiredRange) when a field
 * doesn't fit a named preset — don't invent a new constant for a one-off.
 */

// Accepts bare domains, http(s) URLs, optional paths / query strings.
export const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;

// --- Required field presets ---

/** Required name: min 3, max 100. Org / location / module names. */
export const NAME: ValidatorFn[] = [
  Validators.required, Validators.minLength(3), Validators.maxLength(100),
];

/** Required short name: min 2, max 100. Section/class names etc. */
export const SHORT_NAME: ValidatorFn[] = [
  Validators.required, Validators.minLength(2), Validators.maxLength(100),
];

/** Required long name: min 2, max 200. Class general name. */
export const LONG_NAME: ValidatorFn[] = [
  Validators.required, Validators.minLength(2), Validators.maxLength(200),
];

/** Required code: min 3, max 20. General codes. */
export const CODE: ValidatorFn[] = [
  Validators.required, Validators.minLength(3), Validators.maxLength(20),
];

/** Required short code: min 3, max 5. Location codes. */
export const SHORT_CODE: ValidatorFn[] = [
  Validators.required, Validators.minLength(3), Validators.maxLength(5),
];

/** Required email + max 100. */
export const REQUIRED_EMAIL: ValidatorFn[] = [
  Validators.required, Validators.email, Validators.maxLength(100),
];

// --- Optional field presets ---

/** Optional email + max 100. */
export const EMAIL: ValidatorFn[] = [
  Validators.email, Validators.maxLength(100),
];

/** Notes / description — max 500. */
export const NOTES: ValidatorFn[] = [Validators.maxLength(500)];

/** Short description — max 200. */
export const SHORT_DESCRIPTION: ValidatorFn[] = [Validators.maxLength(200)];

/** URL — max 200 + pattern. */
export const URL: ValidatorFn[] = [
  Validators.maxLength(200), Validators.pattern(URL_PATTERN),
];

// --- Factories for one-off tweaks ---

/** `[required, maxLength(n)]` — e.g. required field with a specific cap. */
export function requiredMaxLength(max: number): ValidatorFn[] {
  return [Validators.required, Validators.maxLength(max)];
}

/** `[maxLength(n)]` — optional field with a specific cap. */
export function maxLength(max: number): ValidatorFn[] {
  return [Validators.maxLength(max)];
}

/** `[required, minLength(min), maxLength(max)]` — when the named presets don't fit. */
export function requiredRange(min: number, max: number): ValidatorFn[] {
  return [Validators.required, Validators.minLength(min), Validators.maxLength(max)];
}
