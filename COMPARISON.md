# ShaanthiEd School Configurations vs VitalSMS — Complete Comparison

> Generated: 2026-05-13  
> school-configurations: `c:\Sathish R\projects\school-configurations`  
> vital-sms: `C:\Sathish R\projects\vital-sms`

---

## Table of Contents

1. [At a Glance](#1-at-a-glance)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Design](#4-database-design)
5. [Authentication & Security](#5-authentication--security)
6. [Module Inventory — Side by Side](#6-module-inventory--side-by-side)
7. [API Surface Comparison](#7-api-surface-comparison)
8. [Features Unique to school-configurations](#8-features-unique-to-school-configurations)
9. [Features Unique to vital-sms](#9-features-unique-to-vital-sms)
10. [Shared Concepts (Different Implementations)](#10-shared-concepts-different-implementations)
11. [Data Model Comparison](#11-data-model-comparison)
12. [Code Patterns Comparison](#12-code-patterns-comparison)
13. [What Is Missing in Each Project](#13-what-is-missing-in-each-project)

---

## 1. At a Glance

| Dimension | school-configurations | vital-sms |
|---|---|---|
| **Purpose** | Full-stack school management system with dynamic form engine | Multi-tenant SaaS backend API for school management |
| **Maturity** | Feature-complete settings layer + dynamic engine | Phase 1B (auth, org, location, user) — early stage |
| **Stack** | Node.js + Express + Angular 21 | Java 21 + Spring Boot 3.4 (backend only) |
| **Frontend** | Full Angular SPA (dynamic forms, lists, layouts) | None — API only |
| **Multi-tenancy** | Single-tenant | Multi-tenant (database-per-tenant) |
| **Database** | PostgreSQL (raw SQL, pg driver) | PostgreSQL (Hibernate/JPA) |
| **Auth** | JWT (jsonwebtoken) | JWT (JJWT 0.12.6) |
| **API Docs** | None (manual) | Swagger/OpenAPI (SpringDoc) |
| **Testing** | Playwright e2e (configured) | Testcontainers integration tests |
| **Billing** | No | Yes (plans, subscriptions, invoices) |
| **Dynamic Forms** | Yes (DocType engine) | No |
| **File Uploads** | Yes (Multer + polymorphic) | No (logo_url only) |
| **Chat** | Yes (real-time SSE) | No |
| **Notifications** | Yes | No |
| **Session Tracking** | Yes (per-device, per-route) | No |
| **Edit Locks** | Yes (optimistic + pessimistic) | Optimistic only (@Version) |

---

## 2. Technology Stack

### school-configurations

**Backend:**
| Package | Version | Purpose |
|---|---|---|
| express | ^4.21.2 | HTTP framework |
| pg | ^8.13.1 | PostgreSQL driver |
| jsonwebtoken | ^9.0.2 | JWT |
| bcryptjs | ^2.4.3 | Password hashing |
| multer | ^2.1.1 | File uploads |
| uuid | ^13.0.0 | UUID generation |
| ua-parser-js | ^2.0.9 | User agent parsing |
| dotenv | ^16.4.7 | Environment config |

**Frontend:**
| Package | Version | Purpose |
|---|---|---|
| @angular/core | ^21.0.6 | UI framework |
| tailwindcss | ^4.1.18 | CSS utility framework |
| apexcharts | ^3.35.3 | Charts |
| xlsx | ^0.18.5 | Excel export |
| jspdf | ^4.2.1 | PDF export |
| rxjs | ^7.8.2 | Reactive programming |
| ngx-sonner | ^2.0.1 | Toast notifications |

### vital-sms

| Library | Version | Purpose |
|---|---|---|
| Spring Boot | 3.4.0 | Application framework |
| Hibernate / JPA | 6.4+ | ORM + multi-tenancy |
| JJWT | 0.12.6 | JWT |
| BCrypt | (Spring Security) | Password hashing |
| MapStruct | 1.6.3 | DTO mapping |
| SpringDoc OpenAPI | 2.7.0 | Swagger docs |
| Testcontainers | latest | Integration testing |
| Lombok | latest | Boilerplate reduction |
| Flyway | (configured, disabled) | DB migrations |

---

## 3. Architecture Overview

### school-configurations

```
┌─────────────────────────────────────────────┐
│              Angular 21 SPA                  │
│  modules: auth, dashboard, dynamic,          │
│           engine, layout, profile, settings  │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────┐
│           Express.js API Server              │
│  /api/v1/auth, /users, /locations, ...       │
│  /api/v1/engine/meta|records|relations       │
├─────────────────────────────────────────────┤
│  Middleware: auth.middleware, async-handler  │
│  Helpers: pagination, validate, repo,        │
│           location-scope, jwt, response      │
├─────────────────────────────────────────────┤
│  Modules: settings/, engine/, files/,        │
│           chat/, notifications/, edit-locks/ │
└────────────────────┬────────────────────────┘
                     │ pg (raw SQL)
┌────────────────────▼────────────────────────┐
│  PostgreSQL — schemas: settings, engine,     │
│               master (+ dynamic DDL tables)  │
└─────────────────────────────────────────────┘
```

**Pattern:** Routes → Controller → Service → Repository (4-file module pattern)  
**DB access:** Raw parameterized SQL — no ORM  
**Soft deletes:** `deleted_at IS NULL` on every query  
**Location scoping:** Every list query intersects `user_locations` with header selection  

---

### vital-sms

```
┌─────────────────────────────────────────────────────┐
│                 HTTP Request                          │
│  /{tenantCode}/api/v1/{resource}                     │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│             TenantPathFilter                         │
│  Extract tenant code → validate → set TenantContext  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         JwtAuthenticationFilter                      │
│  Validate JWT → cross-check tid claim vs tenant path │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│        Spring Security + @PreAuthorize               │
│  Authorities: {MODULE_CODE}_{PERMISSION_CODE}        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│          Controllers (extend BaseController)         │
│  → Services (@Transactional) → Repositories (JPA)   │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐    ┌───────────▼──────────┐
│  Master DB      │    │  Tenant DB(s)         │
│ vitalsms_master │    │ vitalsms_{tenantCode} │
│ (tenant, plan,  │    │ (users, org, location,│
│  subscription,  │    │  group, group_module) │
│  invoice, menu, │    │                       │
│  module, perm)  │    │                       │
└─────────────────┘    └──────────────────────┘
```

**Pattern:** Controller → Service → Repository (Spring MVC layered)  
**DB access:** Spring Data JPA + Hibernate (entity-first)  
**Multi-tenancy:** Hibernate `AbstractDataSourceBasedMultiTenantConnectionProviderImpl`  
**Soft deletes:** `deletedAt IS NULL` via JPA queries  

---

## 4. Database Design

### school-configurations — Table Inventory

| Schema | Table | Purpose |
|---|---|---|
| settings | users | User accounts |
| settings | organizations | Organization master (multi-record) |
| settings | locations | Branches / campuses |
| settings | addresses | Polymorphic address store |
| settings | address_mappings | links addresses to any entity |
| settings | modules | Feature module definitions |
| settings | menus | Sidebar navigation groups |
| settings | menu_modules | Menu ↔ Module mapping |
| settings | groups | User groups (roles) |
| settings | group_modules | Group ↔ Menu assignment |
| settings | permissions | Permission types (VIEW, CREATE…) |
| settings | group_permissions | Group ↔ Module ↔ Permission |
| settings | record_edit_locks | Pessimistic edit locking |
| settings | permission_requests | User permission requests |
| settings | notifications | In-app notifications |
| settings | conversations | Chat threads |
| settings | conversation_members | Chat participants |
| settings | messages | Chat messages |
| settings | files | Polymorphic file attachments |
| settings | user_locations | User ↔ Location access |
| settings | user_preferences | JSONB preferences per user |
| settings | sessions | Login session records |
| settings | session_activity | Per-route activity tracking |
| settings | app_settings | Key-value config store |
| engine | doctypes | DocType metadata (low-code schema) |
| engine | doctype_fields | Field definitions per DocType |
| master | sequence_codes | Auto-number sequence types |
| master | sequence_controls | Per-location sequence configuration |
| (dynamic) | {slug} tables | Engine-created tables per DocType |

**Total: 28+ tables** (grows as DocTypes are added)

---

### vital-sms — Table Inventory

| DB | Table | Purpose |
|---|---|---|
| master | tenant | Tenant registry (JDBC URL, plan, status) |
| master | super_admin_user | Super-admin accounts |
| master | tenant_provisioning_log | Tenant lifecycle audit |
| master | plan | Billing plans |
| master | plan_module | Plan ↔ Module inclusions |
| master | subscription | Active subscriptions per tenant |
| master | invoice | Billing invoices |
| master | menu | UI navigation menus |
| master | app_module | Feature modules |
| master | menu_module | Menu ↔ Module mapping |
| master | tenant_module | Enabled modules per tenant |
| master | permission | Permission codes |
| per-tenant | app_user | User accounts |
| per-tenant | organization | Singleton org profile |
| per-tenant | location | Branches / campuses |
| per-tenant | user_location_access | User ↔ Location grants |
| per-tenant | group | User groups |
| per-tenant | group_module | Group ↔ Module ↔ Permission |
| per-tenant | user_group | User ↔ Group membership |

**Total: ~19 tables** (7 per-tenant + 12 master)

---

## 5. Authentication & Security

| Aspect | school-configurations | vital-sms |
|---|---|---|
| Token type | JWT (access token) | JWT (access + refresh tokens) |
| Token TTL | Not specified in code | Access: 15 min, Refresh: 30 days |
| Token claims | userId, username, groupCode | userId, username, tenantCode |
| Refresh token | Endpoint exists in routes | Defined but not yet implemented |
| Password hashing | bcryptjs (rounds default) | BCrypt strength 12 |
| Account lockout | No | Yes (5 failures → 15 min lock) |
| Session tracking | Yes (full session table + activity) | No (stateless JWT only) |
| Per-device revoke | Yes (revoke by session id) | No |
| RBAC model | Group → GroupPermission → Module | Group → GroupModule (code-based) |
| Permission check | authorizeModule(CODE, ACTION) middleware | @PreAuthorize hasAnyAuthority() |
| Authority format | checked at middleware | {MODULE_CODE}_{PERMISSION_CODE} |
| Multi-tenant JWT | No (single tenant) | Yes (tid claim cross-checked) |
| CSRF protection | CORS-based | Spring Security CSRF disabled (API) |

---

## 6. Module Inventory — Side by Side

| Feature Area | school-configurations | vital-sms |
|---|---|---|
| **Authentication** | auth module (login, refresh, me, permissions, locations) | auth module (login, me) |
| **Users** | Full CRUD + bulk delete + import + location assignment | Full CRUD + activate/deactivate + location assignment |
| **Organizations** | Full CRUD (multi-record) + file upload | Singleton per tenant (update only) |
| **Locations** | Full CRUD + bulk delete + address + phones | Full CRUD + activate/deactivate |
| **Groups** | Full CRUD + permission matrix | Full CRUD |
| **Permissions** | Master list CRUD | Master permission codes only |
| **Menus** | Full CRUD + parent hierarchy + module assignment | Master menu list (no CRUD API yet) |
| **Modules** | Full CRUD + route assignment | Master module list (no CRUD API yet) |
| **Group-Permissions** | Group ↔ Module ↔ Permission matrix | GroupModule (code-based) |
| **Sessions** | Full tracking (per-device, per-route, analytics) | Not implemented |
| **Notifications** | In-app notifications + SSE stream | Not implemented |
| **Chat** | Direct & group messaging with SSE | Not implemented |
| **File Uploads** | Polymorphic (any entity type) | logo_url (URL reference only) |
| **Edit Locks** | Optimistic (version) + pessimistic (DB lock record) | Optimistic only (@Version) |
| **Addresses** | Polymorphic address table | Single address string per entity |
| **Sequences** | Auto-numbering per location per type | Not implemented |
| **DocType Engine** | Full (define schema + CRUD + relations at runtime) | Not implemented |
| **Dynamic Forms** | Yes (Angular runtime rendering) | No |
| **Dashboard** | Widgets (academic summary, charts) | No |
| **Multi-tenancy** | No (single tenant) | Full (database-per-tenant) |
| **Billing/Plans** | No | Full (Plan, Subscription, Invoice) |
| **Subscription** | No | Yes (TRIAL, MONTHLY, QUARTERLY, ANNUAL) |
| **Invoicing** | No | Yes (generate, mark paid) |
| **API Docs** | No | Swagger/OpenAPI |
| **Excel Export** | Yes (frontend: xlsx library) | No |
| **PDF Export** | Yes (frontend: jsPDF) | No |
| **User Preferences** | Yes (JSONB per user) | No |
| **Theme (dark/light)** | Yes (ThemeService) | No |
| **Permission Requests** | Yes (user can request access) | No |

---

## 7. API Surface Comparison

### school-configurations — 90+ Endpoints

| Group | Endpoints |
|---|---|
| auth | login, logout, refresh, me, myPermissions, myLocations |
| users | list, get, create, update, delete, bulkDelete, dropdown, import, checkUnique |
| organizations | list, get, create, update, delete, bulkDelete, dropdown, import, checkUnique |
| locations | list, get, create, update, delete, bulkDelete, dropdown, import, checkUnique |
| groups | list, get, create, update, delete, bulkDelete, dropdown, import |
| permissions | list, get, create, update, delete, bulkDelete, dropdown, import |
| menus | list, get, create, update, delete, bulkDelete, dropdown, withModules, import |
| modules | list, get, create, update, delete, bulkDelete, dropdown, import |
| menu-modules | list, get, create, update, delete, bulkDelete, import |
| group-modules | list, get, create, update, delete, bulkDelete, import |
| sessions | list, mine, online, get, revoke, revokeOwn, revokeOthers, activity, analytics |
| notifications | list, unreadCount, markRead, markAllRead, stream (SSE) |
| chat | conversations, users, messages, start, markRead, unreadCount, typing |
| files | get, byEntity, upload |
| edit-locks | acquire, release |
| preferences | get, update, track |
| engine/meta | list, get, create, update, delete, dropdown, fields |
| engine/records | list, get, create, update, delete, bulkDelete, dropdown, checkUnique (per slug) |
| engine/relations | get, save, matrix (per junction table) |
| pincode | lookup |

### vital-sms — ~20 Endpoints (Phase 1B)

| Group | Endpoints |
|---|---|
| auth | login, me |
| organization | get (singleton), update |
| locations | list (paged), get, create, update, activate, deactivate |
| users | list (paged), get, me, create, update, activate, deactivate |
| user-locations | listForUser, replace, revokeOne |
| plans | list, get |
| subscriptions | list, get, create, cancel |
| invoices | list, get, markPaid |

---

## 8. Features Unique to school-configurations

1. **Full Angular Frontend** — Complete SPA with routing, guards, layouts, dark/light themes
2. **DocType Engine** — Define custom record types at runtime (no-code, like ERPNext/Frappe)
3. **Dynamic Forms & Lists** — Runtime Angular component rendering from DocType metadata
4. **12-column colspan grid** — Drag-and-drop field ordering, per-field width control
5. **Chat / Messaging** — Real-time direct and group chat using Server-Sent Events
6. **In-app Notifications** — SSE-streamed, per-user notification feed
7. **Session Tracking** — Per-device session table, per-route activity, online users, analytics
8. **Per-device Session Revoke** — Force logout on specific device
9. **Edit Locks** — Pessimistic DB-level lock (record_edit_locks) prevents concurrent edits
10. **Permission Requests** — Users can request additional access
11. **Polymorphic File Uploads** — Any entity can have files (avatars, documents, logos)
12. **Polymorphic Addresses** — Normalized address table linked to any entity
13. **Auto-number Sequences** — Per-location number sequences (e.g. EMP-MAIN-001)
14. **User Preferences (JSONB)** — Persisted theme, sidebar state, last-used filters
15. **Bulk Import** — CSV/Excel import for most settings tables
16. **Bulk Delete** — Multi-select delete across all list pages
17. **Excel / PDF Export** — Frontend xlsx + jsPDF export for list data
18. **Dashboard Widgets** — ApexCharts-based analytics widgets
19. **Pincode Lookup** — India pincode → city/state auto-fill
20. **User Agent Parsing** — Device, browser, OS info per session

---

## 9. Features Unique to vital-sms

1. **Multi-tenancy** — Database-per-tenant with TenantPathFilter, TenantContext (ThreadLocal), DynamicMultiTenantConnectionProvider
2. **Tenant Provisioning** — Auto-create tenant database + schema + seed data on first login
3. **Billing Plans** — TRIAL / BASIC / PREMIUM with monthly, yearly, quarterly pricing
4. **Subscriptions** — Full lifecycle (create, cancel, expire) with billing cycles
5. **Invoicing** — Auto-generate invoice on subscription creation, mark-paid flow
6. **Plan-Module Access Control** — TenantModule table gates which features are enabled per tenant
7. **Refresh Token (designed)** — JWT refresh token type + TTL (endpoint pending)
8. **Account Lockout** — Auto-lock after 5 failed login attempts for 15 minutes
9. **JWT Tenant Cross-Check** — tid claim in JWT verified against URL path tenant (prevents cross-tenant token reuse)
10. **Optimistic Locking with Version** — @Version field on all entities, 409 on stale update
11. **Testcontainers Tests** — Cross-tenant isolation tests, service + controller integration tests
12. **Docker-first** — Dockerfile + docker-compose.dev.yaml for containerized dev
13. **OpenAPI / Swagger UI** — Auto-generated interactive API docs
14. **MapStruct DTO Mapping** — Compile-time type-safe entity ↔ DTO conversions

---

## 10. Shared Concepts (Different Implementations)

| Concept | school-configurations | vital-sms |
|---|---|---|
| Soft delete | `deleted_at` timestamp + `deleted_by` | `deletedAt` + `deletedBy` via BaseEntity.markDeleted() |
| Audit fields | created_by, updated_by, created_at, updated_at on every table | BaseEntity with createdBy, updatedBy, createdAt, updatedAt |
| RBAC | Group → group_permissions → (module + permission) | Group → group_module → (module_code + permission_code) |
| Location scoping | user_locations junction + applyLocationScope() helper | user_location_access junction + UserLocationAccessService |
| Pagination | Custom paginate() helper (pg) | Spring Data Pageable + PagedResponse DTO |
| Validation | validate.helper.js (rule objects) | Jakarta Validation (@Valid, @NotBlank, @Size…) |
| Error handling | response.helper.js + handleError() | GlobalExceptionHandler + BusinessException |
| JWT auth | jwt.helper.js + auth.middleware.js | JwtService + JwtAuthenticationFilter |
| Unique check | repo.helper.checkUnique() | JPA query + BusinessException.conflict() |
| Password hashing | bcryptjs | BCrypt (Spring Security) |
| Organization | Multi-record CRUD | Singleton per tenant |
| Group default | SUPER_ADMIN auto-assigned | is_default flag → auto-assign to new users |

---

## 11. Data Model Comparison

### Users

| Field | school-configurations | vital-sms |
|---|---|---|
| id | UUID | Long (auto-increment) |
| username | yes | yes |
| password | password (hashed) | password_hash |
| full_name | yes | yes |
| email | yes | yes |
| phone | phone + phone_code | phone (string) |
| person_type | staff / employee / student / parent | — |
| person_id | FK to related person | — |
| group_id | FK (single group) | via user_group junction |
| is_admin | — | yes |
| last_login | last_login | last_login_at |
| lockout | — | failed_login_count, locked_until |
| version | — | @Version Long |

### Organizations

| Field | school-configurations | vital-sms |
|---|---|---|
| id | UUID | Long |
| name | yes | yes |
| code | — | yes |
| reg_no | yes | reg_no |
| board | — | yes (education board) |
| email | yes | yes |
| phone | primary + alternate (code + number) | phone (string) |
| website | yes | yes |
| logo | file upload (files table) | logo_url (string) |
| address | polymorphic (address_mappings) | single address string |
| social media | 5 social fields | — |

### Locations

| Field | school-configurations | vital-sms |
|---|---|---|
| id | UUID | Long |
| organization_id | yes | yes |
| name | yes | yes |
| code | yes | yes |
| type | enum (main_branch, branch, campus…) | — |
| is_head_office | — | yes |
| email | yes | yes |
| phone | primary + alternate (code + number) | phone (string) |
| address | polymorphic (address_mappings) | single address string |

---

## 12. Code Patterns Comparison

### Controller Pattern

**school-configurations (Node.js):**
```js
async function create(req, resp) {
  const result = await userService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'User created');
}
module.exports = wrap({ create, getAll, getById, update, remove });
```

**vital-sms (Spring Boot):**
```java
@PostMapping
@PreAuthorize("hasAnyAuthority('USER_CREATE', 'ADMIN')")
public ResponseEntity<ApiResponse<UserResponse>> create(
    @Valid @RequestBody UserCreateRequest req,
    @AuthenticationPrincipal UserPrincipal actor) {
  return created(userService.create(req, actor.getId()));
}
```

### Service Pattern

**school-configurations:**
```js
async function create(body, userId) {
  const errors = validate(body, RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };
  const scope = await getUserLocationScope(userId);
  const err = assertLocationAllowed(scope, body.location_id);
  if (err) return err;
  const exists = await repo.checkUnique(body.code);
  if (exists) return { error: 'conflict', message: 'Code already exists' };
  const record = await repo.create(body, userId);
  return { data: record };
}
```

**vital-sms:**
```java
@Transactional
public LocationResponse create(LocationCreateRequest req, Long actorId) {
  if (locationRepository.existsByCodeIgnoreCaseAndDeletedAtIsNull(req.code()))
    throw BusinessException.conflict("Code already exists");
  Location loc = new Location(req.code(), req.name(), ...);
  loc.setCreatedBy(actorId);
  return locationMapper.toResponse(locationRepository.save(loc));
}
```

### Error Handling

| Aspect | school-configurations | vital-sms |
|---|---|---|
| Return errors | `{ error: 'notFound', message: '...' }` | Throw `BusinessException.notFound(msg)` |
| HTTP mapping | `res.handleError(resp, result)` | `@GlobalExceptionHandler` |
| Validation | Manual `validate(body, RULES)` | `@Valid` + Jakarta annotations |
| 404 | `{ error: 'notFound' }` | `throw BusinessException.notFound()` |
| 409 | `{ error: 'conflict' }` | `throw BusinessException.conflict()` |

---

## 13. What Is Missing in Each Project

### school-configurations — Gaps (compared to vital-sms)

| Gap | Priority | Notes |
|---|---|---|
| Multi-tenancy | High | Currently single-tenant; would need full architecture change |
| Refresh token endpoint | Medium | Route defined but not wired to actual refresh logic |
| Account lockout | Medium | No failed-attempt tracking |
| Subscription / billing | Low | Not a school-side concern |
| Docker deployment | Medium | No Dockerfile or docker-compose |
| API documentation | Medium | No Swagger/OpenAPI |
| Integration tests | Medium | Only Playwright e2e configured |
| JWT cross-tenant check | N/A | Not applicable (single tenant) |
| Optimistic locking (version) | Low | Edit locks are pessimistic; no @version equivalent |

### vital-sms — Gaps (compared to school-configurations)

| Gap | Priority | Notes |
|---|---|---|
| Frontend / UI | High | API only; no Angular frontend |
| DocType Engine | High | No dynamic schema / low-code forms |
| Chat / Messaging | High | Not in roadmap until Phase 3+ |
| Notifications | High | Not implemented |
| Session tracking | High | No per-device session or activity log |
| Edit locks (pessimistic) | Medium | Only @Version optimistic locking |
| File uploads | Medium | Only logo_url string |
| Polymorphic addresses | Medium | Single address string per entity |
| Auto-number sequences | Medium | Not implemented |
| User preferences | Low | No persisted UI preferences |
| Bulk import / export | Low | Not implemented |
| Permission requests | Low | Not implemented |
| Dashboard / analytics | Low | No dashboard API |
| Pincode lookup | Low | India-specific |
| Social media fields | Low | Not in org entity |
| phone_code support | Low | Phone stored as plain string |
| Excel / PDF export | Low | Not implemented |

---

*End of Comparison Document*
