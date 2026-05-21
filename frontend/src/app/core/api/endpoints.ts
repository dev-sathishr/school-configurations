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
    dropdown: '/users/dropdown',
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
  // ── Sessions ─────────────────────────────────────────────────────
  sessions: {
    base: '/sessions',
    detail: (id: string) => `/sessions/${id}`,
    mine: '/sessions/me',
    online: '/sessions/online',
    revoke: (id: string) => `/sessions/${id}/revoke`,
    revokeOwn: (id: string) => `/sessions/me/${id}/revoke`,
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

  // ── DocType Engine ────────────────────────────────────────────────
  engineMeta: {
    base: '/engine/meta',
    detail: (slug: string) => `/engine/meta/${slug}`,
    dropdown: '/engine/meta/dropdown',
    fields: (slug: string) => `/engine/meta/${slug}/fields`,
    field: (slug: string, id: number) => `/engine/meta/${slug}/fields/${id}`,
  },
  engineRecords: {
    base: (slug: string) => `/engine/records/${slug}`,
    detail: (slug: string, id: string) => `/engine/records/${slug}/${id}`,
    dropdown: (slug: string) => `/engine/records/${slug}/dropdown`,
    deleteMultiple: (slug: string) => `/engine/records/${slug}/delete-multiple`,
    checkUnique: (slug: string) => `/engine/records/${slug}/check-unique`,
    fetchFields: (slug: string, id: string, fields: string[]) => `/engine/records/${slug}/${id}/fetch?fields=${fields.join(',')}`,
    namingSeriesPreview: (slug: string, field: string, locationId?: string) =>
      `/engine/records/${slug}/naming-series-preview?field=${field}${locationId ? `&location_id=${locationId}` : ''}`,
  },
  engineRelations: {
    get:    (junctionTable: string, parentId: string) => `/engine/relations/${encodeURIComponent(junctionTable)}/${parentId}`,
    save:   (junctionTable: string, parentId: string) => `/engine/relations/${encodeURIComponent(junctionTable)}/${parentId}`,
    matrix: (junctionTable: string, parentId: string) => `/engine/relations/${encodeURIComponent(junctionTable)}/${parentId}/matrix`,
  },
  engineChildRecords: {
    list:    (parentSlug: string, parentId: string, fieldName: string) => `/engine/child-records/${parentSlug}/${parentId}/${fieldName}`,
    create:  (parentSlug: string, parentId: string, fieldName: string) => `/engine/child-records/${parentSlug}/${parentId}/${fieldName}`,
    replace: (parentSlug: string, parentId: string, fieldName: string) => `/engine/child-records/${parentSlug}/${parentId}/${fieldName}/replace`,
    update:  (parentSlug: string, parentId: string, fieldName: string, rowId: string) => `/engine/child-records/${parentSlug}/${parentId}/${fieldName}/${rowId}`,
    delete:  (parentSlug: string, parentId: string, fieldName: string, rowId: string) => `/engine/child-records/${parentSlug}/${parentId}/${fieldName}/${rowId}`,
  },
  engineWorkflow: {
    get:        (slug: string) => `/engine/workflow/${slug}`,
    save:       (slug: string) => `/engine/workflow/${slug}`,
    delete:     (slug: string) => `/engine/workflow/${slug}`,
    actions:    (slug: string, recordId: string) => `/engine/workflow/${slug}/${recordId}/actions`,
    transition: (slug: string, recordId: string) => `/engine/workflow/${slug}/${recordId}/transition`,
  },
  enginePrintFormats: {
    list:   (slug: string) => `/engine/print-formats/${slug}`,
    create: (slug: string) => `/engine/print-formats/${slug}`,
    detail: (slug: string, id: string) => `/engine/print-formats/${slug}/${id}`,
    render: (slug: string, id: string, recordId: string) => `/engine/print-formats/${slug}/${id}/render/${recordId}`,
  },

} as const;

