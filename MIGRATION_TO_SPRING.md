# Migration Plan: school-configurations → vital-sms (Node.js → Spring Boot)

> Generated: 2026-05-13  
> Goal: Port all school-configurations features (DocType engine, chat, notifications, sessions,
> files, sequences, full RBAC, dynamic forms backend) into vital-sms as multi-tenant Spring Boot modules.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Changes, What Stays](#2-what-changes-what-stays)
3. [Target Architecture](#3-target-architecture)
4. [Phase-by-Phase Roadmap](#4-phase-by-phase-roadmap)
5. [Module-by-Module Migration Guide](#5-module-by-module-migration-guide)
   - 5.1 Database & Migrations (Flyway)
   - 5.2 Auth & Security
   - 5.3 Settings Modules (Users, Groups, Permissions, Menus, Modules, Organizations, Locations)
   - 5.4 Session Tracking
   - 5.5 Notifications
   - 5.6 Chat / Messaging
   - 5.7 File Uploads
   - 5.8 Edit Locks
   - 5.9 Addresses (Polymorphic)
   - 5.10 Sequences (Auto-numbering)
   - 5.11 DocType Engine (Meta + Records + Relations)
   - 5.12 Dynamic Form Backend
6. [New Entities & Tables Required](#6-new-entities--tables-required)
7. [API Endpoint Mapping](#7-api-endpoint-mapping)
8. [Helper/Utility Mapping (Node → Spring)](#8-helperutility-mapping-node--spring)
9. [Frontend Strategy](#9-frontend-strategy)
10. [Spring Package Structure](#10-spring-package-structure)
11. [Key Architecture Decisions](#11-key-architecture-decisions)
12. [What NOT to Migrate](#12-what-not-to-migrate)
13. [Estimated Effort](#13-estimated-effort)

---

## 1. Executive Summary

school-configurations is a single-tenant Node.js + Angular system with:
- A complete settings/admin layer (users, orgs, locations, groups, permissions, menus, modules)
- A unique **DocType Engine** — define custom record schemas at runtime (like ERPNext/Frappe)
- Real-time features: chat, notifications, session tracking
- File uploads, polymorphic addresses, auto-number sequences

vital-sms is a multi-tenant Spring Boot API with:
- Solid multi-tenancy infrastructure (database-per-tenant)
- Billing, subscriptions, invoices
- Phase 1B features only (auth, org, location, user)

**The migration goal** is to bring all school-configurations features into vital-sms — keeping the multi-tenant architecture of vital-sms while adding everything that school-configurations has.

The result will be a **production-ready, multi-tenant, full-featured school management API** in Java/Spring Boot that a proper Angular frontend (or the existing one) can connect to.

---

## 2. What Changes, What Stays

### Keep from vital-sms (do not change)
- Multi-tenant infrastructure (TenantPathFilter, TenantContext, DynamicMultiTenantConnectionProvider, TenantRegistry)
- Master database design (tenant, plan, subscription, invoice, menu, app_module, permission)
- JWT security (JwtService, JwtAuthenticationFilter, UserPrincipal)
- GlobalExceptionHandler + BusinessException pattern
- BaseEntity (id, version, audit fields, markDeleted)
- MapStruct DTO mapping pattern
- Testcontainers integration test setup
- Docker + docker-compose setup
- Flyway migration strategy

### Change in vital-sms (extend or replace)
- Add all missing entity tables to per-tenant schema
- Add 10+ new modules (sessions, notifications, chat, files, edit-locks, sequences, doctypes)
- Extend existing modules (richer org/location/user fields, phone_code, polymorphic address)
- Replace single-string address with polymorphic address system
- Extend auth module (session tracking, refresh token endpoint, account lockout — already designed)
- Add RBAC group-permissions matrix (module_code + permission_code already exists, extend UI)

### Keep from school-configurations (port to Spring)
- All 28+ tables (adapt SQL → Flyway + JPA entities)
- All business logic (validate, scope, paginate patterns)
- Helper patterns (pagination, location-scope, repo helpers) → Spring Data equivalents
- DocType engine concept (meta, records, DDL runner, relations)
- All API endpoint shapes (keep same REST paths where possible)

---

## 3. Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Angular SPA (existing or new)                     │
│  Connects to /{tenantCode}/api/v1/{resource}                          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS
┌──────────────────────────────────▼───────────────────────────────────┐
│                     Spring Boot Application                           │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  TenantPathFilter → JwtAuthFilter → Spring Security             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Modules (per-tenant):                                                │
│  auth | users | groups | permissions | menus | modules               │
│  organizations | locations | sessions | notifications | chat          │
│  files | edit-locks | sequences | doctypes (engine)                  │
│                                                                       │
│  Master-only modules:                                                 │
│  tenant | plan | subscription | invoice                              │
│                                                                       │
│  Infrastructure:                                                      │
│  TenantContext | DynamicMultiTenantConnectionProvider                 │
│  TenantSchemaInitializer | TenantRegistry                            │
│                                                                       │
│  Commons:                                                             │
│  BaseEntity | ApiResponse | BusinessException | PagedResponse        │
│  BaseService | BaseController | GlobalExceptionHandler               │
└──────────────────────────────────────────────────────────────────────┘
         │                                      │
┌────────▼──────────┐             ┌─────────────▼──────────────┐
│  vitalsms_master  │             │  vitalsms_{tenantCode}       │
│  (tenant, plan,   │             │  (users, org, locations,     │
│   subscription,   │             │   groups, sessions, chat,    │
│   invoice, menu,  │             │   files, doctypes, …)        │
│   module, perm)   │             │                              │
└───────────────────┘             └──────────────────────────────┘
```

---

## 4. Phase-by-Phase Roadmap

### Phase 2A — Core Settings (2–3 weeks)
Bring full settings layer into parity with school-configurations.

- [ ] Flyway: add all settings tables to per-tenant migration
- [ ] Extend User entity (phone_code, person_type, person_id, must_change_password already done)
- [ ] Extend Organization (reg_no, board, social fields, phone_code)
- [ ] Extend Location (type enum, phone_code, alt phone)
- [ ] Polymorphic Address system (Address + AddressMapping entities)
- [ ] Permissions master CRUD API
- [ ] Menus CRUD API (with parent hierarchy)
- [ ] Modules CRUD API
- [ ] Menu-Modules mapping API
- [ ] Group-Permissions matrix API
- [ ] Bulk delete for all list endpoints
- [ ] Dropdown endpoints for all lookup entities
- [ ] Import endpoint (CSV) for users, locations, groups
- [ ] User preferences (JSONB per user)

### Phase 2B — Real-time & Operational (2–3 weeks)
- [ ] Session tracking (login session table + activity)
- [ ] Per-device session revoke
- [ ] Notifications (in-app + SSE stream)
- [ ] Edit locks (pessimistic DB record)
- [ ] Permission requests

### Phase 2C — Files, Addresses, Sequences (1–2 weeks)
- [ ] Polymorphic file upload (MultipartFile → local/S3 storage)
- [ ] File entity + FileController
- [ ] Sequence codes + sequence controls
- [ ] Auto-number generation service

### Phase 3 — DocType Engine (3–4 weeks)
- [ ] DoctypeEntity + DoctypeFieldEntity (JPA)
- [ ] DoctypeMetaController (CRUD for DocType definitions)
- [ ] DDL Runner (generate CREATE TABLE from DocType fields)
- [ ] RecordController (dynamic CRUD for any slug)
- [ ] RecordRepository (raw JDBC/JdbcTemplate for dynamic tables)
- [ ] RelationController (junction table save/read)
- [ ] Metadata cache (in-memory or Redis)

### Phase 4 — Academic Modules (school-specific, future)
- [ ] Academic years
- [ ] Classes, sections
- [ ] Students, admissions, enquiries
- [ ] Attendance, timetable, examinations
- [ ] Fee management

---

## 5. Module-by-Module Migration Guide

---

### 5.1 Database & Migrations (Flyway)

**school-configurations approach:** Single `migrate.js` file runs raw SQL `CREATE TABLE IF NOT EXISTS` statements.

**vital-sms approach:** Flyway versioned migration files (`V{n}__{description}.sql`).

**What to do:**
1. Convert each `CREATE TABLE` block in migrate.js into a Flyway SQL file.
2. Place per-tenant tables in `db/migration/tenant/` (run by TenantSchemaInitializer).
3. Place master tables in `db/migration/master/` (run at startup against master DB).

**File naming:**
```
db/migration/master/
  V1__create_tenant_registry.sql          ← already exists
  V2__create_plans_subscriptions.sql      ← already exists
  V3__create_menus_modules_permissions.sql

db/migration/tenant/
  V1__create_users_groups.sql
  V2__create_organization_location.sql
  V3__create_addresses_files.sql
  V4__create_sessions_notifications.sql
  V5__create_chat.sql
  V6__create_sequences.sql
  V7__create_doctypes_engine.sql
```

**TenantSchemaInitializer change:**
Currently uses Hibernate `ddl-auto=update`. Switch to Flyway per-tenant:
```java
// In TenantSchemaInitializer.initializeTenant(tenantCode):
Flyway flyway = Flyway.configure()
    .dataSource(dataSource)
    .locations("classpath:db/migration/tenant")
    .schemas("public")
    .baselineOnMigrate(true)
    .load();
flyway.migrate();
```

**Soft delete pattern:** All tenant tables must have:
```sql
deleted_at  TIMESTAMPTZ,
deleted_by  BIGINT REFERENCES app_user(id)
```
And all JPA repositories must add `WHERE deletedAt IS NULL` — use Spring Data `@Query` or a shared `Specification`.

---

### 5.2 Auth & Security

**school-configurations has:**
- Login + logout
- Refresh token (route defined, logic partial)
- `GET /me`, `GET /me/permissions`, `GET /me/locations`
- Session created on login

**vital-sms already has:**
- Login + access token + refresh token (designed, refresh endpoint pending)
- `GET /me`
- Account lockout (5 failures)

**What to add:**
```
POST /{tenant}/api/v1/auth/refresh          ← implement the refresh endpoint
POST /{tenant}/api/v1/auth/logout           ← mark session revoked
GET  /{tenant}/api/v1/auth/me/permissions   ← return group_module entries for current user
GET  /{tenant}/api/v1/auth/me/locations     ← return user_location_access for current user
```

**MePermissionsResponse** (new DTO):
```java
record MePermissionsResponse(
    List<PermittedMenu> menus   // each menu → list of modules → list of permissions
) {}
```

This is what the Angular frontend loads on bootstrap to build the sidebar and gate UI buttons.

**Session creation on login:**
When login succeeds, insert a `Session` record (see 5.4 below) and store `sessionId` in the JWT or return it alongside the token.

---

### 5.3 Settings Modules

#### Users (extend existing)

**Add to User entity:**
```java
@Column String phoneCode;           // "+91"
@Column String personType;          // staff/employee/student/parent
@Column Long   personId;            // FK to external person record
@Column Boolean mustChangePassword; // already exists in vital-sms
```

**Add endpoints:**
```
GET  /users/dropdown            ← id + name list for async-selects
POST /users/delete-multiple     ← bulk soft delete
POST /users/import              ← CSV import
GET  /users/check-unique        ← username uniqueness check
```

#### Groups (extend existing)

**Add to Group entity:**
```java
@Column String code;             // SUPER_ADMIN (unique)
@Column String description;
```

**GroupModule entity (richer):**
Already has `module_code + permission_code`. Add:
```java
@ManyToOne Module module;         // FK to master modules
@ManyToOne Permission permission; // FK to master permissions
```

**Add endpoints:**
```
GET  /groups/dropdown
POST /groups/delete-multiple
GET  /groups/{id}/permissions    ← matrix view
PUT  /groups/{id}/permissions    ← save full matrix
```

#### Permissions

**New module** (master data, currently only DevTenantBootstrap seeds them).

```java
@Entity @Table(name = "permission", schema = "master")
public class Permission {
    Long id;
    @Column(unique = true) String code;   // VIEW, CREATE, EDIT, DELETE, IMPORT, EXPORT
    String name;
    String description;
    Boolean isActive;
}
```

**Endpoints:**
```
GET  /master/permissions         ← list all permission types
GET  /master/permissions/dropdown
POST /master/permissions         ← create
PUT  /master/permissions/{id}    ← update
```

#### Menus

**New CRUD API** (currently only seeded via DevTenantBootstrap).

**Menu entity (extend existing):**
```java
@Column String routePath;
@Column Integer displayOrder;
@Column Boolean isActive;
@ManyToOne Menu parent;           // self-referencing hierarchy
```

**Endpoints:**
```
GET  /master/menus               ← list
GET  /master/menus/dropdown
GET  /master/menus/with-modules  ← menu + assigned modules (for sidebar bootstrap)
POST /master/menus               ← create
PUT  /master/menus/{id}          ← update
DELETE /master/menus/{id}        ← soft delete
```

#### Modules

**New CRUD API** (currently only seeded).

**AppModule entity (extend existing):**
```java
@Column String displayName;
@Column String icon;
@Column String routePath;
@Column Integer displayOrder;
@Column Boolean enforceEditLock;
@Column String description;
```

**Endpoints:**
```
GET  /master/modules
GET  /master/modules/dropdown
POST /master/modules
PUT  /master/modules/{id}
DELETE /master/modules/{id}
```

#### Organizations (extend existing)

**Add to Organization entity:**
```java
@Column String primaryPhoneCode;     // "+91"
@Column String primaryPhone;
@Column String alternatePhoneCode;
@Column String alternatePhone;
@Column String socialFacebook;
@Column String socialInstagram;
@Column String socialTwitter;
@Column String socialLinkedin;
@Column String socialYoutube;
@Column String notes;
// Remove: address (string) → use polymorphic Address
```

#### Locations (extend existing)

**Add to Location entity:**
```java
@Column String type;                  // main_branch, branch, campus, annexure, hostel, other
@Column String primaryPhoneCode;
@Column String primaryPhone;
@Column String alternatePhoneCode;
@Column String alternatePhone;
// Remove: address (string) → use polymorphic Address
```

---

### 5.4 Session Tracking

**school-configurations tables:** `sessions`, `session_activity`

**New entities (per-tenant):**

```java
@Entity @Table(name = "session")
public class Session extends BaseEntity {
    @ManyToOne User user;
    Instant loginAt;
    Instant logoutAt;
    Instant lastActivityAt;
    Instant revokedAt;
    @ManyToOne User revokedBy;
    String ipAddress;
    String userAgent;
    String deviceType;          // from ua-parser
    String browser;
    String os;
    Double latitude;
    Double longitude;
    String locationLabel;       // "Chennai, Tamil Nadu, IN"
    String loginMethod;         // "password"
}

@Entity @Table(name = "session_activity")
public class SessionActivity {
    @ManyToOne Session session;
    String moduleCode;
    String routePath;
    Instant accessedAt;
    Instant exitAt;
    String actionType;          // VIEW, CREATE, EDIT, DELETE
    String recordId;
    String resource;
}
```

**New SessionService methods:**
- `createOnLogin(userId, request)` — called by AuthService after successful login
- `recordActivity(sessionId, moduleCode, routePath, actionType)` — called by a filter/interceptor
- `revoke(sessionId, actorId)` — mark revoked
- `revokeAll(userId, exceptSessionId)` — force logout all other devices
- `listOnlineUsers()` — sessions with lastActivityAt in last 5 minutes
- `getMyAnalytics(userId)` — aggregated usage stats

**Endpoints:**
```
GET  /sessions                  ← admin list (pageable, filterable)
GET  /sessions/mine             ← current user's sessions
GET  /sessions/online           ← currently online users
GET  /sessions/{id}             ← session detail + activity
POST /sessions/{id}/revoke      ← admin revoke
POST /sessions/me/{id}/revoke   ← self-revoke one device
POST /sessions/me/revoke-others ← self-revoke all except current
GET  /sessions/analytics        ← admin analytics
```

**Session ID in JWT:**
Add `sid` claim to JWT so every request carries the session ID:
```java
// In JwtService.issueAccessToken():
claims.put("sid", session.getId().toString());
```

---

### 5.5 Notifications

**school-configurations table:** `notifications`

**New entity (per-tenant):**
```java
@Entity @Table(name = "notification")
public class Notification {
    @ManyToOne User user;
    String type;               // "info", "warning", "success", "error"
    String title;
    String message;
    Boolean isRead;
    @Column(columnDefinition = "jsonb") String data;  // extra payload
    Instant createdAt;
}
```

**New NotificationService:**
- `send(userId, type, title, message, data)` — create + push via SSE
- `listForUser(userId, unreadOnly, pageable)`
- `markRead(id, userId)`
- `markAllRead(userId)`
- `getUnreadCount(userId)`

**SSE (Server-Sent Events) in Spring:**
```java
@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public SseEmitter stream(@AuthenticationPrincipal UserPrincipal actor) {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    sseRegistry.register(actor.getId(), emitter);
    return emitter;
}
```

**SseRegistry:** A `ConcurrentHashMap<Long, List<SseEmitter>>` bean (or use Spring's built-in emitter infrastructure). Push to all emitters for a user when a notification is created.

**Endpoints:**
```
GET  /notifications             ← pageable list
GET  /notifications/unread-count
POST /notifications/{id}/mark-read
POST /notifications/mark-all-read
GET  /notifications/stream      ← SSE stream (text/event-stream)
```

---

### 5.6 Chat / Messaging

**school-configurations tables:** `conversations`, `conversation_members`, `messages`

**New entities (per-tenant):**
```java
@Entity @Table(name = "conversation")
public class Conversation extends BaseEntity {
    String type;               // "direct", "group"
    String name;               // null for direct
    @ManyToOne User createdBy;
}

@Entity @Table(name = "conversation_member")
public class ConversationMember {
    @ManyToOne Conversation conversation;
    @ManyToOne User user;
    Instant lastReadAt;
    Instant joinedAt;
}

@Entity @Table(name = "message")
public class Message {
    @ManyToOne Conversation conversation;
    @ManyToOne User sender;
    @Column(columnDefinition = "text") String content;
    Instant createdAt;
}
```

**ChatService methods:**
- `listConversations(userId)` — conversations the user is a member of
- `startOrGetDirect(userId, targetUserId)` — create or reuse direct conversation
- `getMessages(conversationId, userId, pageable)` — paginated messages
- `sendMessage(conversationId, userId, content)` — persist + push SSE event
- `markRead(conversationId, userId)` — update lastReadAt
- `getUnreadCount(userId)` — sum of unread messages across conversations

**SSE for chat:** Reuse the same SseRegistry. Push a chat event when a new message is sent.

**Endpoints:**
```
GET  /chat/conversations
GET  /chat/conversations/{id}/messages
POST /chat/conversations/{id}/messages   ← send message
POST /chat/conversations/{id}/mark-read
POST /chat/conversations/start           ← start or get direct
GET  /chat/unread-count
GET  /chat/users                         ← list users for new conversation
GET  /chat/stream                        ← SSE for real-time messages
```

---

### 5.7 File Uploads

**school-configurations table:** `files` (polymorphic)

**New entity (per-tenant):**
```java
@Entity @Table(name = "file_attachment")
public class FileAttachment extends BaseEntity {
    String entityType;         // "user", "organization", "location", etc.
    String entityId;           // UUID or Long as string
    String fileType;           // "profile_image", "logo", "document"
    String originalName;
    String storedName;
    String mimeType;
    Long size;
    String storagePath;        // local path or S3 key
    String storageType;        // "local", "s3"
    @ManyToOne User createdBy;
}
```

**FileStorageService:**
```java
public interface FileStorageService {
    StoredFile store(MultipartFile file, String entityType, String entityId, String fileType);
    Resource load(String storagePath);
    void delete(String storagePath);
}
// LocalFileStorageService (Phase 1) + S3FileStorageService (Phase 2)
```

**FileController:**
```java
@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<ApiResponse<FileResponse>> upload(
    @RequestParam String entityType,
    @RequestParam String entityId,
    @RequestParam String fileType,
    @RequestPart MultipartFile file,
    @AuthenticationPrincipal UserPrincipal actor) { ... }

@GetMapping("/{id}")
public ResponseEntity<Resource> download(@PathVariable Long id) { ... }

@GetMapping("/by-entity/{entityType}/{entityId}")
public ResponseEntity<ApiResponse<List<FileResponse>>> byEntity(...) { ... }
```

**Endpoints:**
```
POST /files                             ← upload (multipart/form-data)
GET  /files/{id}                        ← download
GET  /files/by-entity/{type}/{entityId} ← list files for an entity
DELETE /files/{id}                      ← soft delete
```

---

### 5.8 Edit Locks

**school-configurations table:** `record_edit_locks`

**New entity (per-tenant):**
```java
@Entity @Table(name = "record_edit_lock")
public class RecordEditLock {
    String moduleCode;
    String recordId;
    @ManyToOne User lockedBy;
    Instant lockedAt;
    Instant expiresAt;
    // Unique: (moduleCode, recordId)
}
```

**EditLockService:**
- `acquire(moduleCode, recordId, userId)` — insert or verify current lock owner
- `release(moduleCode, recordId, userId)` — delete if owned by userId
- `cleanup()` — @Scheduled to delete expired locks every 5 minutes

**Endpoints:**
```
POST /edit-locks/acquire   ← body: { moduleCode, recordId }
POST /edit-locks/release   ← body: { moduleCode, recordId }
```

---

### 5.9 Addresses (Polymorphic)

**school-configurations tables:** `addresses`, `address_mappings`

**New entities (per-tenant):**
```java
@Entity @Table(name = "address")
public class Address extends BaseEntity {
    String addressLine1;
    String addressLine2;
    String pincode;
    String postOffice;
    String city;
    String state;
    String country;
}

@Entity @Table(name = "address_mapping")
public class AddressMapping {
    @ManyToOne Address address;
    String entityType;       // "organization", "location"
    String entityId;
    String addressType;      // "primary", "billing", "shipping", "branch", "registered", "communication", "other"
    Boolean isDefault;
    @ManyToOne User createdBy;
    Instant createdAt;
}
```

**AddressService:**
- `saveForEntity(entityType, entityId, List<AddressRequest> addresses, actorId)` — upsert addresses
- `getForEntity(entityType, entityId)` — return all addresses for an entity
- Called from OrganizationService and LocationService internally

---

### 5.10 Sequences (Auto-numbering)

**school-configurations tables:** `master.sequence_codes`, `master.sequence_controls`

**Keep in master DB** (same as school-configurations).

**New entities (master):**
```java
@Entity @Table(name = "sequence_code", schema = "master")
public class SequenceCode extends BaseEntity {
    @Column(unique = true) String code;   // "EMPLOYEE", "STUDENT"
    String name;
}

@Entity @Table(name = "sequence_control", schema = "master")
public class SequenceControl extends BaseEntity {
    @ManyToOne SequenceCode sequenceCode;
    @Column String locationCode;           // reference to tenant's location code
    String prefix;
    String suffix;
    Integer digitLength;
    Long lastNo;
    Long maxNo;
    String notes;
}
```

**SequenceService:**
```java
@Transactional
public String nextNumber(String sequenceCode, String locationCode) {
    SequenceControl ctrl = repo.findForUpdateByCodeAndLocation(sequenceCode, locationCode);
    // SELECT ... FOR UPDATE (pessimistic lock)
    if (ctrl.getLastNo() >= ctrl.getMaxNo())
        throw BusinessException.conflict("Sequence exhausted");
    ctrl.setLastNo(ctrl.getLastNo() + 1);
    String padded = String.format("%0" + ctrl.getDigitLength() + "d", ctrl.getLastNo());
    return ctrl.getPrefix() + padded + ctrl.getSuffix();
}
```

**Endpoints:**
```
GET  /master/sequences/codes
POST /master/sequences/codes
GET  /master/sequences/controls
POST /master/sequences/controls
PUT  /master/sequences/controls/{id}
POST /master/sequences/next          ← generate next number
```

---

### 5.11 DocType Engine (Meta + Records + Relations)

This is the most complex migration. The DocType engine lets admins define custom record schemas at runtime without code changes.

**school-configurations tables:** `engine.doctypes`, `engine.doctype_fields`, plus dynamically created tables.

#### 5.11.1 DoctypeEntity

```java
@Entity @Table(name = "doctype", schema = "engine")
public class Doctype extends BaseEntity {
    @Column(unique = true) String slug;      // "employees", "fee-types"
    String label;
    String pluralLabel;
    String icon;
    String description;
    Boolean isLocationScoped;
    Boolean autoCreateTable;
    String tableStatus;                       // "pending", "active", "error"
    String lastError;
    String schemaName;                        // "engine", "master"
    String displayMode;                       // "page", "modal", "tab-group"
    String modalSize;
    @Column(columnDefinition = "jsonb") String tabChildren;
    Integer metaVersion;
}

@Entity @Table(name = "doctype_field", schema = "engine")
public class DoctypeField extends BaseEntity {
    @ManyToOne Doctype doctype;
    String fieldName;
    String fieldLabel;
    String fieldType;                         // text, email, select, phone, file, address, relation-widget, …
    Integer displayOrder;
    Integer colSpan;
    String sectionName;
    @Column(columnDefinition = "jsonb") String validators;
    Boolean isUnique;
    Boolean isSearchable;
    Boolean isFilterable;
    Boolean isReadonly;
    Boolean isHidden;
    Boolean showInList;
    String helpText;
    @Column(columnDefinition = "jsonb") String selectOptions;
    String refDoctypeSlug;
    String defaultValue;
}
```

#### 5.11.2 DDL Runner

**school-configurations approach:** `ddl.runner.js` — generates raw SQL from DocType fields.

**Spring equivalent:** A `DdlRunnerService` using `JdbcTemplate`:

```java
@Service
public class DdlRunnerService {
    private final JdbcTemplate jdbc;

    public void ensureTable(Doctype doctype, List<DoctypeField> fields) {
        String schema = doctype.getSchemaName();
        String table  = doctype.getSlug().replace("-", "_");
        String fullTable = "\"" + schema + "\".\"" + table + "\"";

        // Build CREATE TABLE IF NOT EXISTS
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS ").append(fullTable).append(" (");
        sql.append("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),");
        // standard audit cols
        sql.append("  is_active BOOLEAN DEFAULT TRUE,");
        sql.append("  created_at TIMESTAMPTZ DEFAULT NOW(),");
        sql.append("  created_by BIGINT,");
        sql.append("  updated_at TIMESTAMPTZ DEFAULT NOW(),");
        sql.append("  updated_by BIGINT,");
        sql.append("  deleted_at TIMESTAMPTZ,");
        sql.append("  deleted_by BIGINT,");

        for (DoctypeField f : fields) {
            if (isSkippedType(f.getFieldType())) continue;
            sql.append(columnDefinition(f)).append(",");
        }
        // remove trailing comma, close
        sql.deleteCharAt(sql.length() - 1);
        sql.append(")");

        jdbc.execute(sql.toString());
        doctype.setTableStatus("active");
    }

    private String columnDefinition(DoctypeField f) {
        String col = "  \"" + f.getFieldName() + "\" ";
        return switch (f.getFieldType()) {
            case "text", "email", "url", "select", "async-select", "phone", "password" -> col + "VARCHAR(500)";
            case "textarea" -> col + "TEXT";
            case "number" -> col + "NUMERIC";
            case "checkbox" -> col + "BOOLEAN DEFAULT FALSE";
            case "date" -> col + "DATE";
            default -> col + "TEXT";
        };
    }
}
```

#### 5.11.3 RecordController & RecordService

Dynamic CRUD for any slug — the controller is generic, slug comes from path:

```java
@RestController
@RequestMapping("/{tenant}/api/v1/engine/records/{slug}")
public class RecordController {

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<Map<String, Object>>>> list(
        @PathVariable String slug,
        @RequestParam Map<String, String> params,
        @AuthenticationPrincipal UserPrincipal actor) {
        return ok(recordService.list(slug, params, actor));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal UserPrincipal actor) {
        return created(recordService.create(slug, body, actor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(
        @PathVariable String slug,
        @PathVariable String id,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal UserPrincipal actor) {
        return ok(recordService.update(slug, id, body, actor));
    }
    // ... getById, delete, bulkDelete, dropdown, checkUnique
}
```

**RecordService** uses `NamedParameterJdbcTemplate` for dynamic SQL:
```java
@Service
public class RecordService {
    private final NamedParameterJdbcTemplate jdbc;
    private final DoctypeMetaCache metaCache;

    public Map<String, Object> create(String slug, Map<String, Object> body, UserPrincipal actor) {
        Doctype meta = metaCache.get(slug);
        // validate required fields
        // build INSERT with only known field_names from doctype_fields
        String table = "\"" + meta.getSchemaName() + "\".\"" + slug + "\"";
        MapSqlParameterSource params = new MapSqlParameterSource();
        // only include fields that exist in doctype_fields (whitelist)
        for (DoctypeField f : meta.getFields()) {
            if (body.containsKey(f.getFieldName())) {
                params.addValue(f.getFieldName(), body.get(f.getFieldName()));
            }
        }
        params.addValue("created_by", actor.getId());
        String cols = params.getParameterNames().stream().collect(joining(", "));
        String vals = Arrays.stream(params.getParameterNames()).map(n -> ":" + n).collect(joining(", "));
        String sql = "INSERT INTO " + table + " (" + cols + ") VALUES (" + vals + ") RETURNING *";
        return jdbc.queryForMap(sql, params);
    }
}
```

**SECURITY NOTE:** Column names MUST come only from `doctype_fields.field_name` (whitelisted from DB), never from user input directly. This prevents SQL injection even with dynamic queries.

#### 5.11.4 Metadata Cache

```java
@Component
public class DoctypeMetaCache {
    private final ConcurrentHashMap<String, DoctypeWithFields> cache = new ConcurrentHashMap<>();
    private final DoctypeRepository repo;

    public DoctypeWithFields get(String slug) {
        return cache.computeIfAbsent(slug, k -> repo.findBySlugWithFields(k)
            .orElseThrow(() -> BusinessException.notFound("DocType not found: " + k)));
    }

    public void evict(String slug) { cache.remove(slug); }
}
```

#### 5.11.5 RelationController

For junction table operations (group_permissions matrix, user_locations, etc.):

```java
@RestController
@RequestMapping("/{tenant}/api/v1/engine/relations")
public class RelationController {

    @GetMapping("/{junctionTable}/{parentId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> get(...) { ... }

    @PostMapping("/{junctionTable}/{parentId}")
    public ResponseEntity<ApiResponse<Void>> save(...) { ... }

    @GetMapping("/{junctionTable}/{parentId}/matrix")
    public ResponseEntity<ApiResponse<Map<String, Object>>> matrix(...) { ... }
}
```

**Endpoints:**
```
GET  /engine/meta                           ← list doctypes
GET  /engine/meta/{slug}                    ← doctype detail with fields
POST /engine/meta                           ← create doctype
PUT  /engine/meta/{slug}                    ← update doctype
DELETE /engine/meta/{slug}                  ← soft delete

GET  /engine/records/{slug}                 ← list records (pageable)
GET  /engine/records/{slug}/{id}            ← get one
POST /engine/records/{slug}                 ← create
PUT  /engine/records/{slug}/{id}            ← update
DELETE /engine/records/{slug}/{id}          ← soft delete
POST /engine/records/{slug}/delete-multiple ← bulk delete
GET  /engine/records/{slug}/dropdown        ← id+name list
GET  /engine/records/{slug}/check-unique    ← uniqueness check

GET  /engine/relations/{table}/{parentId}   ← get relation rows
POST /engine/relations/{table}/{parentId}   ← save relation rows
GET  /engine/relations/{table}/{parentId}/matrix ← matrix view
```

---

### 5.12 Dynamic Form Backend Support

The Angular dynamic form renders based on DocType metadata fetched from the API. No extra backend work needed beyond 5.11 above. The Angular frontend service `DoctypeConfigService` calls:

```
GET /engine/meta/{slug}    → returns DoctypeConfig (slug, label, fields[], is_location_scoped, display_mode)
```

That response drives the entire form — field types, validators, sections, col_spans.

For the **frontend to connect to vital-sms**, the only change needed in `DoctypeConfigService` is to update the base URL to the new Spring endpoint (same path, different port/host).

---

## 6. New Entities & Tables Required

| Table | Schema | Entity Class | Phase |
|---|---|---|---|
| session | tenant | Session | 2B |
| session_activity | tenant | SessionActivity | 2B |
| notification | tenant | Notification | 2B |
| conversation | tenant | Conversation | 2B |
| conversation_member | tenant | ConversationMember | 2B |
| message | tenant | Message | 2B |
| file_attachment | tenant | FileAttachment | 2C |
| address | tenant | Address | 2A |
| address_mapping | tenant | AddressMapping | 2A |
| record_edit_lock | tenant | RecordEditLock | 2B |
| permission_request | tenant | PermissionRequest | 2B |
| user_preference | tenant | UserPreference | 2A |
| app_settings | tenant | AppSettings | 2A |
| doctype | engine | Doctype | 3 |
| doctype_field | engine | DoctypeField | 3 |
| sequence_code | master | SequenceCode | 2C |
| sequence_control | master | SequenceControl | 2C |

---

## 7. API Endpoint Mapping

| school-configurations path | vital-sms target path | Status |
|---|---|---|
| POST /api/v1/auth/login | POST /{t}/api/v1/auth/login | Exists |
| POST /api/v1/auth/refresh | POST /{t}/api/v1/auth/refresh | Add |
| POST /api/v1/auth/logout | POST /{t}/api/v1/auth/logout | Add |
| GET  /api/v1/auth/me | GET  /{t}/api/v1/auth/me | Exists |
| GET  /api/v1/auth/me/permissions | GET  /{t}/api/v1/auth/me/permissions | Add |
| GET  /api/v1/auth/me/locations | GET  /{t}/api/v1/auth/me/locations | Exists (via /users/me) |
| GET  /api/v1/users | GET  /{t}/api/v1/users | Exists |
| POST /api/v1/users | POST /{t}/api/v1/users | Exists |
| GET  /api/v1/users/:id | GET  /{t}/api/v1/users/{id} | Exists |
| PUT  /api/v1/users/:id | PUT  /{t}/api/v1/users/{id} | Exists |
| DELETE /api/v1/users/:id | POST /{t}/api/v1/users/{id}/deactivate | Exists |
| GET  /api/v1/organizations | GET  /{t}/api/v1/organization | Exists (singleton) |
| PUT  /api/v1/organizations/:id | PUT  /{t}/api/v1/organization | Exists |
| GET  /api/v1/locations | GET  /{t}/api/v1/locations | Exists |
| POST /api/v1/locations | POST /{t}/api/v1/locations | Exists |
| PUT  /api/v1/locations/:id | PUT  /{t}/api/v1/locations/{id} | Exists |
| GET  /api/v1/groups | GET  /{t}/api/v1/groups | Exists |
| GET  /api/v1/permissions | GET  /{t}/api/v1/master/permissions | Add |
| GET  /api/v1/menus | GET  /{t}/api/v1/master/menus | Add |
| GET  /api/v1/modules | GET  /{t}/api/v1/master/modules | Add |
| GET  /api/v1/sessions | GET  /{t}/api/v1/sessions | Add |
| GET  /api/v1/notifications | GET  /{t}/api/v1/notifications | Add |
| GET  /api/v1/notifications/stream | GET  /{t}/api/v1/notifications/stream | Add |
| GET  /api/v1/chat/conversations | GET  /{t}/api/v1/chat/conversations | Add |
| POST /api/v1/files | POST /{t}/api/v1/files | Add |
| POST /api/v1/edit-locks/acquire | POST /{t}/api/v1/edit-locks/acquire | Add |
| GET  /api/v1/engine/meta | GET  /{t}/api/v1/engine/meta | Add |
| GET/POST /api/v1/engine/records/:slug | GET/POST /{t}/api/v1/engine/records/{slug} | Add |
| GET/POST /api/v1/engine/relations | GET/POST /{t}/api/v1/engine/relations/{table}/{id} | Add |

---

## 8. Helper/Utility Mapping (Node → Spring)

| school-configurations helper | Spring equivalent |
|---|---|
| `pagination.helper.js` — paginate(options, query) | Spring Data `Pageable` + `Page<T>` + `PagedResponse<T>` DTO |
| `validate.helper.js` — validate(body, rules) | Jakarta Validation (`@Valid`, `@NotBlank`, `@Size`, `@Email`) |
| `response.helper.js` — success, created, handleError | `BaseController.ok()`, `created()`, `GlobalExceptionHandler` |
| `location-scope.helper.js` — applyLocationScope | JPA Specification or custom `@Query WHERE location.id IN :ids` |
| `repo.helper.js` — softDelete, softDeleteMultiple | `BaseEntity.markDeleted(actorId)` + repository save |
| `jwt.helper.js` — sign, verify | `JwtService.issueAccessToken()`, `JwtService.validateToken()` |
| `password.helper.js` — hash, compare | `PasswordService.hash()`, `PasswordService.matches()` |
| `optimistic-lock.helper.js` | `@Version Long version` on BaseEntity |
| `sequence.helper.js` — nextNumber | `SequenceService.nextNumber()` with `SELECT FOR UPDATE` |
| `address.helper.js` — saveAddresses | `AddressService.saveForEntity()` |
| `async-handler.js` — wrap() | Spring MVC `@ExceptionHandler` in GlobalExceptionHandler |
| `bulk-import.helper.js` — importCSV | Apache POI or OpenCSV + service batch create |
| `user-agent.helper.js` — parseUA | `eu.bitwalker:UserAgentUtils` or `ua-parser-java` library |
| `pincode.helper.js` — lookup | External API call via `RestTemplate` or `WebClient` |
| `module-code.helper.js` | `ModuleCodeService` or enum |

---

## 9. Frontend Strategy

### Option A — Keep the existing Angular frontend, point to vital-sms
- Change `environment.ts` `apiUrl` from `http://localhost:3000/api/v1` to `http://localhost:8080/{tenantCode}/api/v1`
- Add tenant code to all API calls (update `core/api/endpoints.ts` to prepend `/{tenantCode}`)
- No other Angular changes needed — all component/service patterns stay the same
- Best approach if you want to reuse the Angular frontend as-is

### Option B — Build a new Angular frontend for vital-sms (separate repo)
- Start fresh with Angular 21, keep the same `BaseListComponent` / `FormPageBase` patterns
- Benefits: cleaner codebase, can design for multi-tenancy from the start (tenant code in URL)

### Option C — Server-Side Rendering (future)
- Not recommended at this stage

**Recommendation: Option A** — The existing Angular frontend is already well-structured and follows good patterns. Just update the API base URL and add tenant-code awareness to the endpoints service.

---

## 10. Spring Package Structure

```
dev.vitalmed.vitalsms/
├── VitalSmsApplication.java
│
├── config/
│   ├── SecurityConfig.java
│   ├── JpaConfig.java
│   ├── WebMvcConfig.java
│   └── OpenApiConfig.java
│
├── tenant/                            ← existing, no changes
│   ├── TenantContext.java
│   ├── TenantPathFilter.java
│   ├── DynamicMultiTenantConnectionProvider.java
│   ├── TenantDataSourceFactory.java
│   ├── TenantSchemaInitializer.java
│   ├── TenantRegistry.java
│   └── DevTenantBootstrap.java
│
├── security/                          ← existing, no changes
│   ├── JwtService.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsServiceImpl.java
│   ├── PasswordService.java
│   └── UserPrincipal.java
│
├── common/                            ← extend
│   ├── BaseController.java
│   ├── GlobalExceptionHandler.java
│   └── SseRegistry.java              ← NEW: SSE emitter registry
│
├── master/                            ← existing, extend
│   ├── tenant/
│   ├── plan/
│   ├── subscription/
│   ├── invoice/
│   ├── menu/                         ← add CRUD API
│   ├── module/                       ← add CRUD API
│   ├── permission/                   ← add CRUD API
│   ├── sequence/                     ← NEW
│   │   ├── code/
│   │   └── control/
│
└── module/                            ← tenant-scoped modules
    ├── auth/                          ← extend (logout, refresh, me/permissions)
    ├── user/                          ← extend (phone_code, person_type, dropdown, import)
    │   ├── access/                    ← existing
    │   └── preference/               ← NEW
    ├── organization/                  ← extend (social fields, phone_code)
    ├── location/                      ← extend (type, phone_code)
    ├── group/                         ← extend (code, description, permissions matrix)
    ├── address/                       ← NEW (polymorphic)
    ├── file/                          ← NEW
    ├── session/                       ← NEW
    ├── notification/                  ← NEW
    ├── chat/                          ← NEW
    │   ├── conversation/
    │   └── message/
    ├── edit-lock/                     ← NEW
    ├── permission-request/            ← NEW
    └── engine/                        ← NEW (DocType engine)
        ├── meta/
        ├── record/
        ├── relation/
        └── ddl/
```

---

## 11. Key Architecture Decisions

### Decision 1: Where do DocTypes live?
**Options:**
- A. DocTypes per-tenant (each tenant defines their own schemas) ← RECOMMENDED
- B. DocTypes in master DB (shared across tenants)

**Recommendation A:** DocTypes are tenant-specific data — a school defines its own custom forms. Store `doctype` and `doctype_field` tables in the tenant DB, not master. DDL for custom tables also runs against the tenant DB.

### Decision 2: Dynamic table schema — engine schema or default?
Keep the `schema_name` approach from school-configurations. Each DocType can specify:
- `schema_name = "engine"` → tables created in `engine` schema inside the tenant DB
- `schema_name = "master"` → tables in `master` schema (for shared reference data)

### Decision 3: SSE vs WebSocket for real-time
**school-configurations:** SSE (Server-Sent Events) via Node.js.  
**Spring Boot equivalent:** `SseEmitter` — simple, unidirectional, works well for notifications and chat.  
If bidirectional communication is needed later, add Spring WebSocket (STOMP), but SSE is sufficient.

### Decision 4: Dynamic record SQL injection prevention
**Rule:** Column names in dynamic INSERT/SELECT MUST be whitelisted against `doctype_fields.field_name`. Never use user-provided keys directly in SQL. Fetch field list from DB/cache first, then only include keys that match.

### Decision 5: File storage
Start with **local filesystem** (same as school-configurations, `uploads/` directory). Add S3 via `FileStorageService` interface later without changing controllers.

### Decision 6: Flyway vs Hibernate DDL
- Use **Flyway** for static schema migrations (all known tables)
- Use **DdlRunnerService** (JdbcTemplate) for dynamic DocType tables only
- Do NOT use `hibernate.ddl-auto=update` in production

### Decision 7: Pagination
Use Spring Data `Pageable` + custom `PagedResponse<T>`. Map query params `page`, `size`, `sort_by`, `sort_order` to Spring `Pageable`:
```java
@GetMapping
public ResponseEntity<ApiResponse<PagedResponse<LocationResponse>>> list(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(required = false) String q) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    return ok(locationService.search(q, pageable));
}
```

---

## 12. What NOT to Migrate

| school-configurations item | Reason not to migrate |
|---|---|
| Node.js / Express | Replaced entirely by Spring Boot |
| JavaScript helpers (paginate.js, validate.js) | Replaced by Spring Data + Jakarta Validation |
| `async-handler.js` wrap() | Replaced by GlobalExceptionHandler |
| `migrate.js` raw SQL | Replaced by Flyway migration files |
| `seed.js` Node script | Replaced by DevTenantBootstrap (already exists) |
| Angular frontend | Keep as-is, only update API URL (Option A above) |
| `.claude/settings.json` | Claude-specific config, not needed in vital-sms |
| `DYNAMIC_BUILDER_CAPABILITIES.md` | Documentation, not code |

---

## 13. Estimated Effort

| Phase | Features | Estimated Weeks |
|---|---|---|
| 2A | Settings layer (extend users/org/location, permissions/menus/modules CRUD, addresses, user prefs) | 2–3 |
| 2B | Sessions, notifications (SSE), edit locks, permission requests | 2–3 |
| 2C | Files, sequences | 1–2 |
| 3 | DocType engine (meta, DDL runner, records, relations) | 3–4 |
| 4 | Chat / messaging | 1–2 |
| Frontend | Angular → vital-sms URL switch (Option A) | 0.5 |
| Testing | Integration tests per module | ongoing |
| **Total** | | **10–15 weeks** |

---

*End of Migration Document*
