/**
 * Single source of truth for every backend URL the frontend calls.
 * Organised by module, mirroring `backend/src/modules/`. When the backend
 * renames or reshapes an endpoint, this is the only file you touch.
 *
 * Rules:
 * - No raw URL literals elsewhere in the app — reference API.xxx.yyy instead.
 * - Detail routes are functions so the caller can't forget the id:
 *     API.users.detail(id)   →  '/users/{id}'
 * - Don't compose URLs with template strings in the component. If a new
 *   pattern appears (nested sub-resource, side-effect action), add it here
 *   and give it a name.
 *
 * Base path (`/api/v1`) is injected by environment.apiUrl — don't include it.
 */

export const API = {
  // ── Auth & session ─────────────────────────────────────────────────
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    myPermissions: '/auth/me/permissions',
    myLocations: '/auth/me/locations',
  },

  // ── Settings (admin masters) ───────────────────────────────────────
  users: {
    base: '/users',
    detail: (id: string) => `/users/${id}`,
    deleteMultiple: '/users/delete-multiple',
    import: '/users/import',
    checkUnique: '/users/check-unique',
  },
  groups: {
    base: '/groups',
    detail: (id: string) => `/groups/${id}`,
    dropdown: '/groups/dropdown',
    deleteMultiple: '/groups/delete-multiple',
    import: '/groups/import',
  },
  groupModules: {
    base: '/group-modules',
    detail: (id: string) => `/group-modules/${id}`,
    deleteMultiple: '/group-modules/delete-multiple',
    import: '/group-modules/import',
  },
  menus: {
    base: '/menus',
    detail: (id: string) => `/menus/${id}`,
    dropdown: '/menus/dropdown',
    withModules: '/menus/with-modules',
    deleteMultiple: '/menus/delete-multiple',
    import: '/menus/import',
  },
  menuModules: {
    base: '/menu-modules',
    detail: (id: string) => `/menu-modules/${id}`,
    deleteMultiple: '/menu-modules/delete-multiple',
    import: '/menu-modules/import',
  },
  modules: {
    base: '/modules',
    detail: (id: string) => `/modules/${id}`,
    dropdown: '/modules/dropdown',
    deleteMultiple: '/modules/delete-multiple',
    import: '/modules/import',
  },
  permissions: {
    base: '/permissions',
    detail: (id: string) => `/permissions/${id}`,
    dropdown: '/permissions/dropdown',
    deleteMultiple: '/permissions/delete-multiple',
    import: '/permissions/import',
  },
  permissionRequests: {
    base: '/permission-requests',
    pending: '/permission-requests/pending',
  },
  editLocks: {
    acquire: '/edit-locks/acquire',
    release: '/edit-locks/release',
  },
  organizations: {
    base: '/organizations',
    detail: (id: string) => `/organizations/${id}`,
    dropdown: '/organizations/dropdown',
    deleteMultiple: '/organizations/delete-multiple',
    import: '/organizations/import',
    checkUnique: '/organizations/check-unique',
  },
  locations: {
    base: '/locations',
    detail: (id: string) => `/locations/${id}`,
    dropdown: '/locations/dropdown',
    deleteMultiple: '/locations/delete-multiple',
    import: '/locations/import',
    checkUnique: '/locations/check-unique',
  },
  employeeCategories: {
    base: '/employee-categories',
    detail: (id: string) => `/employee-categories/${id}`,
    dropdown: '/employee-categories/dropdown',
    deleteMultiple: '/employee-categories/delete-multiple',
    import: '/employee-categories/import',
  },
  employeeGroups: {
    base: '/employee-groups',
    detail: (id: string) => `/employee-groups/${id}`,
    dropdown: '/employee-groups/dropdown',
    deleteMultiple: '/employee-groups/delete-multiple',
    import: '/employee-groups/import',
  },
  designations: {
    base: '/designations',
    detail: (id: string) => `/designations/${id}`,
    dropdown: '/designations/dropdown',
    deleteMultiple: '/designations/delete-multiple',
    import: '/designations/import',
  },
  employees: {
    base: '/employees',
    detail: (id: string) => `/employees/${id}`,
    nextCode: '/employees/next-code',
    checkUnique: '/employees/check-unique',
    dropdown: '/employees/dropdown',
    linkable: '/employees/linkable',
    deleteMultiple: '/employees/delete-multiple',
    import: '/employees/import',
  },
  employeePayroll: {
    base: (employeeId: string) => `/employees/${employeeId}/payroll`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/payroll/${id}`,
    rejoin: (employeeId: string) => `/employees/${employeeId}/payroll/rejoin`,
  },
  employeeBankAccounts: {
    base: (employeeId: string) => `/employees/${employeeId}/bank-accounts`,
    activate: (employeeId: string, id: string) => `/employees/${employeeId}/bank-accounts/${id}/activate`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/bank-accounts/${id}`,
  },
  employeeQualifications: {
    base:   (employeeId: string) => `/employees/${employeeId}/qualifications`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/qualifications/${id}`,
  },
  employeeExperience: {
    base:   (employeeId: string) => `/employees/${employeeId}/experience`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/experience/${id}`,
  },
  employeeDocuments: {
    base:   (employeeId: string) => `/employees/${employeeId}/documents`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/documents/${id}`,
  },
  employeeFamilyInfo: {
    base:   (employeeId: string) => `/employees/${employeeId}/family`,
    detail: (employeeId: string, id: string) => `/employees/${employeeId}/family/${id}`,
  },
  studentFamilyInfo: {
    base:   (profileId: string) => `/student-profiles/${profileId}/family`,
    detail: (profileId: string, id: string) => `/student-profiles/${profileId}/family/${id}`,
  },
  ifsc: {
    lookup: (code: string) => `/ifsc/${code}`,
  },
  // ── Master ────────────────────────────────────────────────────────
  sequenceCodes: {
    base: '/sequence-codes',
    detail: (id: string) => `/sequence-codes/${id}`,
    dropdown: '/sequence-codes/dropdown',
    deleteMultiple: '/sequence-codes/delete-multiple',
  },
  sequenceControls: {
    base: '/sequence-controls',
    detail: (id: string) => `/sequence-controls/${id}`,
    deleteMultiple: '/sequence-controls/delete-multiple',
  },
  documentTypes: {
    base: '/document-types',
    detail: (id: string) => `/document-types/${id}`,
    dropdown: '/document-types/dropdown',
    deleteMultiple: '/document-types/delete-multiple',
  },
  feeCategories: {
    base: '/fee-categories',
    detail: (id: string) => `/fee-categories/${id}`,
    dropdown: '/fee-categories/dropdown',
    deleteMultiple: '/fee-categories/delete-multiple',
  },

  // ── Academic ──────────────────────────────────────────────────────
  classes: {
    base: '/classes',
    detail: (id: string) => `/classes/${id}`,
    dropdown: '/classes/dropdown',
    deleteMultiple: '/classes/delete-multiple',
    import: '/classes/import',
  },
  classLevels: {
    base: '/class-levels',
    detail: (id: string) => `/class-levels/${id}`,
    byClass: (classGeneralId: string) => `/class-levels?class_general_id=${classGeneralId}`,
    deleteMultiple: '/class-levels/delete-multiple',
  },
  academicYears: {
    base: '/academic-years',
    detail: (id: string) => `/academic-years/${id}`,
    deleteMultiple: '/academic-years/delete-multiple',
  },

  // ── Sessions ─────────────────────────────────────────────────────
  sessions: {
    base: '/sessions',
    detail: (id: string) => `/sessions/${id}`,
    mine: '/sessions/me',
    online: '/sessions/online',
    revoke: (id: string) => `/sessions/${id}/revoke`,
    revokeOthers: '/sessions/me/revoke-others',
    activity: '/sessions/activity',
    action: '/sessions/action',
    myAnalytics: '/sessions/me/analytics',
    analytics: '/sessions/analytics',
    userAnalytics: (userId: string) => `/sessions/users/${userId}/analytics`,
    export: '/sessions/export',
    retention: '/sessions/retention',
    purge: '/sessions/purge',
  },

  // ── Notifications ────────────────────────────────────────────────
  notifications: {
    base: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    stream: '/notifications/stream',
  },

  // ── Student ───────────────────────────────────────────────────────
  studentProfiles: {
    base: '/student-profiles',
    detail: (id: string) => `/student-profiles/${id}`,
    deleteMultiple: '/student-profiles/delete-multiple',
  },

  // ── Chat ─────────────────────────────────────────────────────────
  chat: {
    conversations: '/chat/conversations',
    users: '/chat/users',
    unreadCount: '/chat/unread-count',
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    startConversation: '/chat/conversations',
    markRead: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
    typing: (conversationId: string) => `/chat/conversations/${conversationId}/typing`,
  },

  // ── Files ─────────────────────────────────────────────────────────
  files: {
    detail: (id: string) => `/files/${id}`,
    byEntity: (entityType: string, entityId: string) => `/files/entity/${entityType}/${entityId}`,
    upload: '/files/upload',
  },

  // ── User preferences ──────────────────────────────────────────────
  preferences: {
    base: '/me/preferences',
    track: '/me/preferences/track',
  },

  // ── Pincode lookup ────────────────────────────────────────────────
  pincode: {
    lookup: (pincode: string) => `/pincode/${pincode}`,
  },
} as const;

