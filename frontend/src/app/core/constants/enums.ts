/**
 * Single source of truth for every domain enum the frontend exposes —
 * location types, session statuses, address types, and the badge color maps
 * that render them. Mirrors the backend's accepted values.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface BadgeStyle {
  label: string;
  class: string;
}

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

// ── Session status ──────────────────────────────────────────────────

export type SessionStatus = 'active' | 'ended' | 'revoked';

export const SESSION_STATUS_BADGES: Record<SessionStatus, BadgeStyle> = {
  active:  { label: 'Active',  class: BADGE_CLASS.green },
  ended:   { label: 'Ended',   class: BADGE_CLASS.muted },
  revoked: { label: 'Revoked', class: BADGE_CLASS.red },
};

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

export type LocationAddressType = 'primary' | 'branch' | 'other';

export const LOCATION_ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'branch',  label: 'Branch' },
  { value: 'other',   label: 'Other' },
];

// ── User — Person type ──────────────────────────────────────────────

export type PersonType = 'staff' | 'employee' | 'student' | 'parent';

export const PERSON_TYPE_OPTIONS: SelectOption[] = [
  { value: 'staff',    label: 'Staff' },
  { value: 'employee', label: 'Employee' },
  { value: 'student',  label: 'Student' },
  { value: 'parent',   label: 'Parent' },
];

export const PERSON_TYPE_BADGES: Record<PersonType, BadgeStyle> = {
  staff:    { label: 'Staff',    class: BADGE_CLASS.blue },
  employee: { label: 'Employee', class: BADGE_CLASS.green },
  student:  { label: 'Student',  class: BADGE_CLASS.purple },
  parent:   { label: 'Parent',   class: BADGE_CLASS.orange },
};

export const personTypeLabel = (type: string): string =>
  PERSON_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;

// ── DocType engine ──────────────────────────────────────────────────

export type FieldType =
  | 'text' | 'email' | 'url' | 'number' | 'date'
  | 'select' | 'async-select' | 'textarea' | 'checkbox' | 'phone'
  | 'file' | 'address' | 'relation-widget';

export const FIELD_TYPE_OPTIONS: SelectOption[] = [
  { value: 'text',            label: 'Text' },
  { value: 'email',           label: 'Email' },
  { value: 'number',          label: 'Number' },
  { value: 'date',            label: 'Date' },
  { value: 'select',          label: 'Select (static options)' },
  { value: 'async-select',    label: 'Link (another DocType)' },
  { value: 'textarea',        label: 'Textarea' },
  { value: 'checkbox',        label: 'Checkbox' },
  { value: 'phone',           label: 'Phone' },
  { value: 'url',             label: 'URL' },
  { value: 'file',            label: 'File / Image' },
  { value: 'address',         label: 'Address' },
  { value: 'relation-widget', label: 'Relation Widget (multi-select)' },
];

export const FILE_DISPLAY_STYLE_OPTIONS: SelectOption[] = [
  { value: 'avatar',   label: 'Avatar (circle)' },
  { value: 'photo',    label: 'Photo (portrait)' },
  { value: 'dropzone', label: 'Dropzone' },
];

export const TRANSFORM_OPTIONS: SelectOption[] = [
  { value: '',           label: 'None' },
  { value: 'uppercase',  label: 'UPPERCASE' },
  { value: 'lowercase',  label: 'lowercase' },
  { value: 'titlecase',  label: 'Title Case' },
];

export type TableStatus = 'pending' | 'active' | 'error';

export const TABLE_STATUS_BADGES: Record<TableStatus, BadgeStyle> = {
  pending: { label: 'Pending', class: BADGE_CLASS.muted },
  active:  { label: 'Active',  class: BADGE_CLASS.green },
  error:   { label: 'Error',   class: BADGE_CLASS.red },
};
