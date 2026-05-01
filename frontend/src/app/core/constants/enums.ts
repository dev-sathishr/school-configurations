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

// Organization addresses
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

// Location addresses
export type LocationAddressType = 'primary' | 'branch' | 'other';

export const LOCATION_ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'branch',  label: 'Branch' },
  { value: 'other',   label: 'Other' },
];

// Employee addresses
export type EmployeeAddressType = 'permanent' | 'current' | 'other';

export const EMPLOYEE_ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'current',   label: 'Current' },
  { value: 'other',     label: 'Other' },
];

// Student addresses
export type StudentAddressType = 'permanent' | 'current' | 'other';

export const STUDENT_ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'current',   label: 'Current' },
  { value: 'other',     label: 'Other' },
];

// Relation (family/guardian) addresses
export type RelationAddressType = 'permanent' | 'current' | 'other';

export const RELATION_ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'current',   label: 'Current' },
  { value: 'other',     label: 'Other' },
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

// ── Employee — Gender ───────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

// ── Employee — Blood group ──────────────────────────────────────────

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export const BLOOD_GROUP_OPTIONS: SelectOption[] = [
  { value: 'A+',  label: 'A+' },
  { value: 'A-',  label: 'A-' },
  { value: 'B+',  label: 'B+' },
  { value: 'B-',  label: 'B-' },
  { value: 'O+',  label: 'O+' },
  { value: 'O-',  label: 'O-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
];

// ── Employee — Marital status ───────────────────────────────────────

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

export const MARITAL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'single',   label: 'Single' },
  { value: 'married',  label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed',  label: 'Widowed' },
];

// ── Employee — Religion ─────────────────────────────────────────────

export type Religion = 'hindu' | 'muslim' | 'christian' | 'sikh' | 'buddhist' | 'jain' | 'other';

export const RELIGION_OPTIONS: SelectOption[] = [
  { value: 'hindu',     label: 'Hindu' },
  { value: 'muslim',    label: 'Muslim' },
  { value: 'christian', label: 'Christian' },
  { value: 'sikh',      label: 'Sikh' },
  { value: 'buddhist',  label: 'Buddhist' },
  { value: 'jain',      label: 'Jain' },
  { value: 'other',     label: 'Other' },
];

// ── Employee — Community ────────────────────────────────────────────

export type Community = 'general' | 'obc' | 'sc' | 'st' | 'other';

export const COMMUNITY_OPTIONS: SelectOption[] = [
  { value: 'general', label: 'General' },
  { value: 'obc',     label: 'OBC' },
  { value: 'sc',      label: 'SC' },
  { value: 'st',      label: 'ST' },
  { value: 'other',   label: 'Other' },
];

// ── Student — Nationality ───────────────────────────────────────────

export const NATIONALITY_OPTIONS: SelectOption[] = [
  { value: 'Indian',      label: 'Indian' },
  { value: 'Sri Lankan',  label: 'Sri Lankan' },
  { value: 'Bangladeshi', label: 'Bangladeshi' },
  { value: 'Nepali',      label: 'Nepali' },
  { value: 'Pakistani',   label: 'Pakistani' },
  { value: 'Afghan',      label: 'Afghan' },
  { value: 'Other',       label: 'Other' },
];

// ── Qualification — Degree ──────────────────────────────────────────

export type DegreeLevel = 'school' | 'diploma' | 'ug' | 'pg' | 'doctorate' | 'professional' | 'other';

export const DEGREE_OPTIONS: SelectOption[] = [
  // School
  { value: '10th',       label: '10th (SSLC / Matriculation)' },
  { value: '12th',       label: '12th (HSC / Intermediate)' },
  // Diploma
  { value: 'diploma',    label: 'Diploma' },
  { value: 'pgdiploma',  label: 'Post Graduate Diploma' },
  // Under Graduate
  { value: 'ba',         label: 'B.A — Bachelor of Arts' },
  { value: 'bsc',        label: 'B.Sc — Bachelor of Science' },
  { value: 'bcom',       label: 'B.Com — Bachelor of Commerce' },
  { value: 'bca',        label: 'BCA — Bachelor of Computer Applications' },
  { value: 'bba',        label: 'BBA — Bachelor of Business Administration' },
  { value: 'be',         label: 'B.E — Bachelor of Engineering' },
  { value: 'btech',      label: 'B.Tech — Bachelor of Technology' },
  { value: 'bed',        label: 'B.Ed — Bachelor of Education' },
  { value: 'bpharm',     label: 'B.Pharm — Bachelor of Pharmacy' },
  { value: 'barch',      label: 'B.Arch — Bachelor of Architecture' },
  { value: 'bsw',        label: 'B.S.W — Bachelor of Social Work' },
  { value: 'blib',       label: 'B.Lib — Bachelor of Library Science' },
  // Post Graduate
  { value: 'ma',         label: 'M.A — Master of Arts' },
  { value: 'msc',        label: 'M.Sc — Master of Science' },
  { value: 'mcom',       label: 'M.Com — Master of Commerce' },
  { value: 'mca',        label: 'MCA — Master of Computer Applications' },
  { value: 'mba',        label: 'MBA — Master of Business Administration' },
  { value: 'me',         label: 'M.E — Master of Engineering' },
  { value: 'mtech',      label: 'M.Tech — Master of Technology' },
  { value: 'med',        label: 'M.Ed — Master of Education' },
  { value: 'mpharm',     label: 'M.Pharm — Master of Pharmacy' },
  { value: 'mphil',      label: 'M.Phil — Master of Philosophy' },
  { value: 'msw',        label: 'M.S.W — Master of Social Work' },
  { value: 'mlib',       label: 'M.Lib — Master of Library Science' },
  // Doctorate
  { value: 'phd',        label: 'Ph.D — Doctor of Philosophy' },
  { value: 'dsc',        label: 'D.Sc — Doctor of Science' },
  // Professional
  { value: 'mbbs',       label: 'MBBS — Bachelor of Medicine and Surgery' },
  { value: 'llb',        label: 'LL.B — Bachelor of Laws' },
  { value: 'llm',        label: 'LL.M — Master of Laws' },
  { value: 'ca',         label: 'CA — Chartered Accountant' },
  { value: 'icwa',       label: 'ICWA / CMA — Cost & Management Accountant' },
  { value: 'cs',         label: 'CS — Company Secretary' },
  // Other
  { value: 'other',      label: 'Other' },
];

// ── Bank account type ───────────────────────────────────────────────

export type BankAccountType = 'savings' | 'current' | 'salary' | 'other';

export const BANK_ACCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
  { value: 'salary',  label: 'Salary' },
  { value: 'other',   label: 'Other' },
];

export const BANK_ACCOUNT_TYPE_BADGES: Record<BankAccountType, BadgeStyle> = {
  savings: { label: 'Savings', class: BADGE_CLASS.green },
  current: { label: 'Current', class: BADGE_CLASS.blue },
  salary:  { label: 'Salary',  class: BADGE_CLASS.purple },
  other:   { label: 'Other',   class: BADGE_CLASS.muted },
};

// ── Document type category ──────────────────────────────────────────

export type DocumentTypeCategory =
  | 'KYC'
  | 'EDUCATIONAL'
  | 'EMPLOYMENT'
  | 'STATUTORY'
  | 'MEDICAL'
  | 'OTHER';

export const DOCUMENT_TYPE_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'KYC',         label: 'KYC / Identity' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'EMPLOYMENT',  label: 'Employment' },
  { value: 'STATUTORY',   label: 'Statutory / Compliance' },
  { value: 'MEDICAL',     label: 'Medical' },
  { value: 'OTHER',       label: 'Other' },
];

export const DOCUMENT_TYPE_CATEGORY_BADGES: Record<DocumentTypeCategory, BadgeStyle> = {
  KYC:         { label: 'KYC / Identity',        class: BADGE_CLASS.blue },
  EDUCATIONAL: { label: 'Educational',            class: BADGE_CLASS.purple },
  EMPLOYMENT:  { label: 'Employment',             class: BADGE_CLASS.green },
  STATUTORY:   { label: 'Statutory / Compliance', class: BADGE_CLASS.orange },
  MEDICAL:     { label: 'Medical',                class: BADGE_CLASS.red },
  OTHER:       { label: 'Other',                  class: BADGE_CLASS.muted },
};

// ── Relation type (family info) ─────────────────────────────────────

export type RelationType =
  | 'father' | 'mother' | 'spouse' | 'son' | 'daughter'
  | 'brother' | 'sister' | 'guardian' | 'legal_guardian'
  | 'grandfather' | 'grandmother' | 'grandson' | 'granddaughter'
  | 'uncle' | 'aunt' | 'nephew' | 'niece'
  | 'stepfather' | 'stepmother' | 'stepson' | 'stepdaughter'
  | 'father_in_law' | 'mother_in_law' | 'other';

// ── Student Profile ────────────────────────────────────────────────────────

export type ProfileStatus = 'profile_created' | 'enquiry' | 'admitted' | 'enrolled' | 'withdrawn' | 'alumni';

export const PROFILE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'profile_created', label: 'Profile Created' },
  { value: 'enquiry',   label: 'Enquiry' },
  { value: 'admitted',  label: 'Admitted' },
  { value: 'enrolled',  label: 'Enrolled' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'alumni',    label: 'Alumni' },
];

export const PROFILE_STATUS_BADGES: Record<string, { label: string; class: string }> = {
  profile_created: { label: 'Profile Created', class: 'bg-muted text-muted-foreground' },
  enquiry:   { label: 'Enquiry',   class: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  admitted:  { label: 'Admitted',  class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  enrolled:  { label: 'Enrolled',  class: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  withdrawn: { label: 'Withdrawn', class: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  alumni:    { label: 'Alumni',    class: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
};

// ── Student Enquiry status ──────────────────────────────────────────

export type EnquiryStatus = 'open' | 'follow_up' | 'converted' | 'closed' | 'cancelled';

export const ENQUIRY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'open',       label: 'Open' },
  { value: 'follow_up',  label: 'Follow Up' },
  { value: 'converted',  label: 'Converted' },
  { value: 'closed',     label: 'Closed' },
  { value: 'cancelled',  label: 'Cancelled' },
];

export const ENQUIRY_STATUS_BADGES: Record<string, BadgeStyle> = {
  open:       { label: 'Open',       class: BADGE_CLASS.blue },
  follow_up:  { label: 'Follow Up',  class: BADGE_CLASS.orange },
  converted:  { label: 'Converted',  class: BADGE_CLASS.green },
  closed:     { label: 'Closed',     class: BADGE_CLASS.muted },
  cancelled:  { label: 'Cancelled',  class: BADGE_CLASS.red },
};

export type GenderType = 'male' | 'female' | 'other';

export const GENDER_LABELS: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other',
};

export type BloodGroupType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

// ── Relation Types ─────────────────────────────────────────────────────────

// Relation types where only one instance per student makes sense
export const UNIQUE_RELATION_TYPES = new Set([
  'father', 'mother', 'spouse', 'guardian', 'legal_guardian',
  'grandfather', 'grandmother', 'stepfather', 'stepmother',
  'father_in_law', 'mother_in_law',
]);

export const RELATION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'father',         label: 'Father' },
  { value: 'mother',         label: 'Mother' },
  { value: 'spouse',         label: 'Spouse' },
  { value: 'son',            label: 'Son' },
  { value: 'daughter',       label: 'Daughter' },
  { value: 'brother',        label: 'Brother' },
  { value: 'sister',         label: 'Sister' },
  { value: 'guardian',       label: 'Guardian' },
  { value: 'legal_guardian', label: 'Legal Guardian' },
  { value: 'grandfather',    label: 'Grandfather' },
  { value: 'grandmother',    label: 'Grandmother' },
  { value: 'grandson',       label: 'Grandson' },
  { value: 'granddaughter',  label: 'Granddaughter' },
  { value: 'uncle',          label: 'Uncle' },
  { value: 'aunt',           label: 'Aunt' },
  { value: 'nephew',         label: 'Nephew' },
  { value: 'niece',          label: 'Niece' },
  { value: 'stepfather',     label: 'Stepfather' },
  { value: 'stepmother',     label: 'Stepmother' },
  { value: 'stepson',        label: 'Stepson' },
  { value: 'stepdaughter',   label: 'Stepdaughter' },
  { value: 'father_in_law',  label: 'Father-in-Law' },
  { value: 'mother_in_law',  label: 'Mother-in-Law' },
  { value: 'other',          label: 'Other' },
];
