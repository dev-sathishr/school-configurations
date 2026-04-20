/**
 * Single source of truth for every domain enum the frontend exposes —
 * location types, academic levels, session statuses, address types, and the
 * badge color maps that render them. Mirrors the backend's accepted values.
 *
 * Rules:
 * - No inline `{ value, label }` option arrays in components — import the
 *   `*_OPTIONS` const from here and bind it to `<app-form-field>`.
 * - No per-list `STATUS_BADGES` constants — reference the badge maps here.
 * - Adding a new allowed value → update the string-union type + the options
 *   array + the label/badge record in one place.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface BadgeStyle {
  label: string;
  class: string;
}

// Reusable tailwind classes for semantic states — keeps the colors in sync
// across every badge map without copy-paste drift.
const BADGE_CLASS = {
  green:  'bg-green-500/10 text-green-700',
  red:    'bg-red-500/10 text-red-700',
  blue:   'bg-blue-500/10 text-blue-700',
  purple: 'bg-purple-500/10 text-purple-700',
  orange: 'bg-orange-500/10 text-orange-700',
  muted:  'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
} as const;

// ── Active / Inactive ───────────────────────────────────────────────
// Used by every list's `is_active` column. Row transform maps boolean →
// 'Active' / 'Inactive' string and this record picks up the badge.

export const STATUS_BADGES: Record<string, BadgeStyle> = {
  'Active':   { label: 'Active',   class: BADGE_CLASS.green },
  'Inactive': { label: 'Inactive', class: BADGE_CLASS.red },
};

export const statusLabel = (isActive: boolean): 'Active' | 'Inactive' =>
  isActive ? 'Active' : 'Inactive';

// ── Location type ───────────────────────────────────────────────────

export type LocationType =
  | 'main_branch' | 'branch' | 'campus' | 'annexure'
  | 'hostel' | 'playground' | 'other';

export const LOCATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'main_branch', label: 'Main Branch' },
  { value: 'branch',      label: 'Branch' },
  { value: 'campus',      label: 'Campus' },
  { value: 'annexure',    label: 'Annexure' },
  { value: 'hostel',      label: 'Hostel' },
  { value: 'playground',  label: 'Playground' },
  { value: 'other',       label: 'Other' },
];

export const LOCATION_TYPE_BADGES: Record<LocationType, BadgeStyle> = {
  main_branch: { label: 'Main Branch', class: BADGE_CLASS.blue },
  branch:      { label: 'Branch',      class: BADGE_CLASS.green },
  campus:      { label: 'Campus',      class: BADGE_CLASS.purple },
  annexure:    { label: 'Annexure',    class: BADGE_CLASS.muted },
  hostel:      { label: 'Hostel',      class: BADGE_CLASS.orange },
  playground:  { label: 'Playground',  class: BADGE_CLASS.muted },
  other:       { label: 'Other',       class: BADGE_CLASS.muted },
};

// ── Academic level ──────────────────────────────────────────────────

export type AcademicLevel =
  | 'nursery' | 'primary' | 'middle' | 'secondary' | 'higher_secondary';

export const ACADEMIC_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'nursery',          label: 'Nursery' },
  { value: 'primary',          label: 'Primary' },
  { value: 'middle',           label: 'Middle' },
  { value: 'secondary',        label: 'Secondary' },
  { value: 'higher_secondary', label: 'Higher Secondary' },
];

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> =
  ACADEMIC_LEVEL_OPTIONS.reduce((acc, o) => {
    acc[o.value as AcademicLevel] = o.label;
    return acc;
  }, {} as Record<AcademicLevel, string>);

// ── Session status ──────────────────────────────────────────────────

export type SessionStatus = 'active' | 'ended' | 'revoked';

export const SESSION_STATUS_BADGES: Record<SessionStatus, BadgeStyle> = {
  active:  { label: 'Active',  class: BADGE_CLASS.green },
  ended:   { label: 'Ended',   class: BADGE_CLASS.muted },
  revoked: { label: 'Revoked', class: BADGE_CLASS.red },
};

// ── Academic-year default flag ──────────────────────────────────────
// The list transforms the `is_default` boolean into 'Default' / '—'
// and this map applies the badge. Kept separate from STATUS_BADGES since
// the "default" concept is specific to academic years.

export const DEFAULT_FLAG_BADGES: Record<string, BadgeStyle> = {
  'Default': { label: '★ Default', class: BADGE_CLASS.primary },
  '—':       { label: '—',         class: 'bg-muted/20 text-muted-foreground' },
};

export const defaultFlagLabel = (isDefault: boolean): 'Default' | '—' =>
  isDefault ? 'Default' : '—';

// ── Address type ────────────────────────────────────────────────────

export type AddressType =
  | 'primary' | 'registered' | 'communication' | 'billing' | 'branch' | 'other';

export const ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'primary',       label: 'Primary' },
  { value: 'registered',    label: 'Registered' },
  { value: 'communication', label: 'Communication' },
  { value: 'billing',       label: 'Billing' },
  { value: 'branch',        label: 'Branch' },
  { value: 'other',         label: 'Other' },
];
