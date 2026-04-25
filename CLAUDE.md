# ShaanthiEd — Codebase Rules & Architecture

**Read this first. It's for humans (developers) and AI agents alike.** This file is the authoritative source of how code is organized, what patterns to reuse, and how new modules should look. When in doubt, match what's here, not what you see in one random older file.

---

## Table of contents

1. [TL;DR cheat sheet](#1-tldr-cheat-sheet)
2. [Project structure](#2-project-structure)
3. [Frontend rules](#3-frontend-rules)
   1. [Lists — extend `BaseListComponent`](#31-lists--extend-baselistcomponent)
   2. [Forms — extend `FormPageBase`](#32-forms--extend-formpagebase)
   3. [Validation presets](#33-validation-presets)
   4. [Shared components inventory](#34-shared-components-inventory)
   5. [Permissions UI (icons, buttons)](#35-permissions-ui)
   6. [Location scoping](#36-location-scoping)
   7. [Signals over BehaviorSubject](#37-signals-over-behaviorsubject)
   8. [API calls — always `CommonService`](#38-api-calls)
   9. [Types (`any` discipline)](#39-types)
4. [Backend rules](#4-backend-rules)
   1. [Module layer convention](#41-module-layer-convention)
   2. [Controllers — no try/catch](#42-controllers--no-trycatch)
   3. [Services — validation + result shape](#43-services--validation--result-shape)
   4. [Repositories — DB only, shared helpers](#44-repositories--db-only-shared-helpers)
   5. [Pagination](#45-pagination)
   6. [Auth middleware](#46-auth-middleware)
   7. [Location scoping (server)](#47-location-scoping-server)
   8. [Response shape](#48-response-shape)
   9. [SQL security rules](#49-sql-security)
5. [End-to-end flows](#5-end-to-end-flows)
   1. [Login & bootstrap](#51-login--bootstrap)
   2. [Opening a list page](#52-opening-a-list-page)
   3. [Creating / updating a record](#53-creating--updating-a-record)
   4. [Changing the header location](#54-changing-the-header-location)
   5. [Adding a brand-new CRUD module](#55-adding-a-brand-new-crud-module)
6. [Common pitfalls](#6-common-pitfalls)
7. [Field length & validator reference](#7-field-length--validator-reference)

---

## 1. TL;DR cheat sheet

| Task | Do this |
|---|---|
| New list page | `extends BaseListComponent`; declare `apiUrl`, `routeBase`, `columns`, `displayKeyMap`, `rowTransform` |
| New form page | `extends FormPageBase`; declare `listRoute`, `resourcePath`; implement `buildForm()` |
| Location-aware list | `[extraParams]="locationCtx.scopeExtraParams()"` on `<app-table>` |
| Location-aware form | `<app-location-field>` with `[recordLocation]="recordLocation()"` for edit mode |
| Phone field | `<app-form-field fieldType="phone">` |
| Required name field | `name: ['', V.NAME]` |
| Notes field | `notes: ['', V.NOTES]` |
| URL field | `website: ['', V.URL]` |
| Permission-gated button | `*appHasPermission="['MODULE_CODE', 'ACTION']"` or `[disabled]="!ps.canEdit('MODULE_CODE')"` |
| Call the API | `this.cs.getService({ url, params })` — never `HttpClient` directly |
| API URL | `API.users.base`, `API.classes.detail(id)` — from `core/api/endpoints.ts`, never raw literals |
| Enum / badge / option list | Import from `core/constants/enums.ts` — `STATUS_BADGES`, `LOCATION_TYPE_OPTIONS`, etc. |
| New backend module | 4 files: `.routes.js`, `.controller.js`, `.service.js`, `.repository.js` |
| Controller method | No try/catch. Wrap exports with `wrap({...})` from `async-handler` |
| Soft delete in repo | `repoHelper.softDelete({ table, id, userId })` |
| List pagination | `paginate({ table, alias, searchColumns, filterableColumns, sortableColumns, ... }, query)` |
| Location scope in repo | `applyLocationScope({ column, scope, requested: query.location_ids })` |
| Single-record response | `{ success, message, data: {...} }` — always |

---

## 2. Project structure

```
school-project/
├── backend/
│   └── src/
│       ├── server.js                  # Express bootstrap, route mounting, global error handler
│       ├── config/database.js         # pg pool
│       ├── db/
│       │   ├── migrate.js             # DDL
│       │   └── seed.js                # seed data (groups, menus, modules, permissions)
│       ├── shared/
│       │   ├── helpers/               # pagination, validate, response, location-scope, repo, jwt, etc.
│       │   ├── middleware/            # auth, async-handler
│       │   └── services/              # sse (server-sent events)
│       └── modules/
│           ├── auth/                  # login, refresh, me, me/permissions, me/locations
│           ├── chat/
│           ├── files/
│           ├── notifications/
│           ├── academic/
│           │   ├── classes/           # one module = one CRUD entity
│           │   └── class-levels/
│           └── settings/
│               ├── users/
│               ├── groups/
│               ├── group-modules/     # group ↔ menu mapping
│               ├── menus/
│               ├── menu-modules/      # menu ↔ module mapping
│               ├── modules/
│               ├── permissions/
│               ├── permission-requests/
│               ├── locations/
│               ├── organizations/
│               ├── user-locations/    # user ↔ location mapping (empty, logic in users module)
│               └── user-preferences/
│
└── frontend/
    └── src/app/
        ├── core/                      # singletons — do NOT import from modules/
        │   ├── guards/                # AuthGuard, MenuAccessGuard, ModulePermissionGuard, DefaultRedirectGuard
        │   ├── interceptor/           # auth.interceptor (Bearer token, 401/403 handling)
        │   ├── models/
        │   ├── services/              # AuthService, PermissionService, LocationContextService, UserPreferencesService, ThemeService, UsageTrackingService
        │   ├── constants/
        │   └── utils/
        ├── shared/                    # reusable — do NOT import from modules/
        │   ├── components/
        │   │   ├── base-list/         # BaseListComponent (abstract)
        │   │   ├── form-page/         # FormPageBase (abstract)
        │   │   ├── table/             # <app-table>
        │   │   ├── form-field/        # <app-form-field> + <app-form-field-phone>
        │   │   ├── location-field/    # <app-location-field>
        │   │   ├── select-dropdown/   # <app-select-dropdown>
        │   │   ├── breadcrumb/
        │   │   ├── button/
        │   │   ├── loader/
        │   │   ├── modal/
        │   │   ├── confirm-dialog/
        │   │   ├── address/
        │   │   └── file-upload/
        │   ├── directives/            # has-permission, click-outside
        │   ├── pipes/
        │   ├── services/              # CommonService (API wrapper), ToastService
        │   ├── validators/            # common.ts — NAME, CODE, NOTES, URL, etc.
        │   └── utils/
        └── modules/
            ├── auth/
            ├── dashboard/
            ├── layout/                # sidebar, navbar, menu service
            ├── profile/
            ├── academic/
            │   └── pages/class/       # class-list, class-form, class-level-form, class-general-form
            └── settings/
                └── pages/
                    ├── user/          # user-list + user-form
                    ├── group/
                    ├── location/
                    └── ...            # one dir per CRUD page
```

**Dependency direction**: `modules/` → `shared/` → `core/`. Never reverse. Never cross-module imports (`modules/academic` must not import from `modules/settings`; if needed, hoist the shared code to `shared/` or `core/`).

---

## 3. Frontend rules

### 3.1 Lists — extend `BaseListComponent`

Defined in [frontend/src/app/shared/components/base-list/base-list.component.ts](frontend/src/app/shared/components/base-list/base-list.component.ts). Every CRUD list extends it. The base owns:

- `@ViewChild(TableComponent) table` — access to the table for `reloadCurrentPage()` etc.
- `cs: CommonService` (protected), `ps: PermissionService` (public for templates)
- `addNew()`, `editSelected(row)`, `viewSelected(row)` — navigation using `routeBase`

Subclass declares only what's specific. Template calls inherited methods.

```ts
// Required
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  imports: [TableComponent, ButtonComponent, BreadcrumbComponent, HasPermissionDirective],
})
export class UserListComponent extends BaseListComponent {
  apiUrl = API.users.base;                           // from core/api/endpoints.ts
  override deleteUrl = API.users.deleteMultiple;     // optional; omit if no bulk delete
  routeBase = '/settings/user';                // frontend route prefix

  columns: ColumnConfig[] = [ /* ... */ ];
  displayKeyMap: Record<string, string> = { /* api_field: column_key */ };
  rowTransform = (row: any, mapped: any) => {
    // optional — transform row values for display
    return mapped;
  };
}
```

Template pattern (always the same shape):

```html
<div class="mb-6"><app-breadcrumb /></div>

<div class="mb-4 flex justify-end">
  <app-button *appHasPermission="['USERS', 'CREATE']" (buttonClick)="addNew()">+ New User</app-button>
</div>

<app-table
  [apiUrl]="apiUrl"
  [deleteUrl]="deleteUrl"
  [columns]="columns"
  [displayKeyMap]="displayKeyMap"
  [rowTransform]="rowTransform"
  [extraParams]="locationCtx.scopeExtraParams()"   <!-- if location-scoped -->
  [canEdit]="ps.canEdit('USERS')"
  [canDelete]="ps.canDelete('USERS')"
  [canImport]="ps.canImport('USERS')"
  [canExport]="ps.canExport('USERS')"
  (onEdit)="editSelected($event)"
  (onView)="viewSelected($event)" />
```

### 3.2 Forms — extend `FormPageBase`

Defined in [frontend/src/app/shared/components/form-page/form-page.base.ts](frontend/src/app/shared/components/form-page/form-page.base.ts). Every CRUD form extends it. The base owns:

- Injections: `fb`, `cs`, `route`, `cdr`, `ps`
- State: `form`, `editMode`, `viewMode`, `editId`, `submitted`, `saving`, `loading`, `errorMessage`
- Flow: `ngOnInit()` → `buildForm()` → `detectModeAndLoad()` → `onSubmit()` → `afterSave()` / `handleSaveError()`
- Navigation: `cancel()`, `switchToEdit()`
- Getter: `f` (form.controls)

**Required** overrides:
- `listRoute` — `'/settings/user'` etc.
- `resourcePath` — `API.users.base` etc. (always from `core/api/endpoints.ts`)
- `buildForm(): FormGroup`

**Optional** hooks — override only when needed:

| Hook | Default | Override when |
|---|---|---|
| `unwrapResponse(res)` | `res?.data ?? res` | Almost never (after response-shape standardization) |
| `onRecordLoaded(data)` | `patchValue(data)` | Need to seed labels, related state, sticky values |
| `toPayload()` | `this.form.value` | Need to transform (phone merge, password stripping, flatten nested) |
| `beforeSubmit()` | `true` | Extra validation beyond the reactive form (required addresses, locations, etc.) — return `false` to abort |
| `afterSave(res)` | navigate to `listRoute` | File upload chains, alternate routes (e.g. jump to child tab) |
| `handleSaveError(err)` | set `errorMessage` | Show a toast, do extra cleanup |

**Minimal form** (covers ~40% of cases):

```ts
@Component({
  selector: 'app-permission-form',
  templateUrl: './permission-form.component.html',
  imports: [ReactiveFormsModule, ButtonComponent, FormFieldComponent, LoaderComponent, BreadcrumbComponent],
})
export class PermissionFormComponent extends FormPageBase {
  listRoute = '/settings/permission';
  resourcePath = API.permissions.base;

  protected buildForm(): FormGroup {
    return this.fb.group({
      name: ['', V.NAME],
      code: ['', V.CODE],
      description: ['', V.NOTES],
      is_active: [true],
    });
  }
}
```

**Form with related state** (labels, file upload):

```ts
export class OrganizationFormComponent extends FormPageBase {
  @ViewChild('logoUpload') logoUpload!: FileUploadComponent;
  listRoute = '/settings/organization';
  resourcePath = API.organizations.base;

  addresses: Address[] = [];
  addressError = '';
  logo: UploadedFile | null = null;

  protected buildForm(): FormGroup { /* ... */ }

  protected override onRecordLoaded(d: any): void {
    this.form.patchValue({
      ...d,
      primary_phone: { code: d.primary_contact_code, number: d.primary_contact_no },
      // ...
    });
    this.addresses = d.addresses || [];
    this.logo = d.logo || null;
  }

  protected override beforeSubmit(): boolean {
    this.addressError = this.addresses.length === 0 ? 'At least one address is required' : '';
    return !this.addressError;
  }

  protected override toPayload(): any {
    const val = this.form.value;
    return { ...val, addresses: this.addresses, /* flatten phones, etc. */ };
  }

  protected override afterSave(res: any): void {
    // Chain pending logo upload after create (we now have the parent id)
    const createdId = res?.data?.id;
    const pending = !this.editMode && createdId ? this.logoUpload?.uploadPendingFile(createdId) : null;
    if (pending) {
      pending.subscribe({ next: () => this.navigateAfterSave(), error: () => this.navigateAfterSave() });
    } else {
      this.navigateAfterSave();
    }
  }
}
```

**Forms with pre-load** (matrix, dropdowns needed before the record fetch) — override `ngOnInit`, chain `detectModeAndLoad()`:

```ts
override ngOnInit(): void {
  this.form = this.buildForm();
  forkJoin({ menus: /*...*/, permissions: /*...*/ }).subscribe({
    next: (res) => {
      // ... populate this.menuTree from res ...
      this.detectModeAndLoad();  // now fetch the record
    },
  });
}
```

### 3.3 Validation presets

Always import from [shared/validators/common.ts](frontend/src/app/shared/validators/common.ts) as `V`:

```ts
import * as V from '@shared/validators/common';
// or relative: import * as V from '../../../../../shared/validators/common';
```

**Named presets** (covers 80% of fields):

| Preset | Validators | Use for |
|---|---|---|
| `V.NAME` | required, min 3, max 100 | Org / location / module name |
| `V.SHORT_NAME` | required, min 2, max 100 | Section, class level name |
| `V.LONG_NAME` | required, min 2, max 200 | Class general / longer titles |
| `V.CODE` | required, min 3, max 20 | General codes |
| `V.SHORT_CODE` | required, min 3, max 5 | Location codes |
| `V.REQUIRED_EMAIL` | required, email, max 100 | User email |
| `V.EMAIL` | email, max 100 | Optional email |
| `V.NOTES` | max 500 | Notes / description field |
| `V.SHORT_DESCRIPTION` | max 200 | Tagline-style |
| `V.URL` | max 200, URL pattern | Website / social links |

**Factories** for tweaks:

| Factory | Returns |
|---|---|
| `V.maxLength(n)` | `[maxLength(n)]` |
| `V.requiredMaxLength(n)` | `[required, maxLength(n)]` |
| `V.requiredRange(min, max)` | `[required, minLength(min), maxLength(max)]` |

**Rule**: don't invent a new constant for a one-off field — use a factory. Only add a preset to `common.ts` if it's used in 3+ forms.

### 3.3b Domain enums — `core/constants/enums.ts`

Every allowed-value list (location types, academic levels, session statuses, address types, status badges) lives in [core/constants/enums.ts](frontend/src/app/core/constants/enums.ts). Never redeclare these inline.

| Export | Use for |
|---|---|
| `LOCATION_TYPE_OPTIONS` / `LocationType` | `<app-form-field fieldType="select">` for location.type |
| `LOCATION_TYPE_BADGES` | `<app-table>` badge map on location list |
| `ACADEMIC_LEVEL_OPTIONS` / `ACADEMIC_LEVEL_LABELS` / `AcademicLevel` | class/section forms + class list transform |
| `ADDRESS_TYPE_OPTIONS` / `AddressType` | address modal dropdown |
| `SESSION_STATUS_BADGES` / `SessionStatus` | session lists + session-detail type |
| `STATUS_BADGES` + `statusLabel(isActive)` | every list's `is_active` column (Active / Inactive) |
| `DEFAULT_FLAG_BADGES` + `defaultFlagLabel(isDefault)` | "Default" star badge (academic-year list) |

Pattern:
```ts
import { ACADEMIC_LEVEL_OPTIONS, STATUS_BADGES, statusLabel } from 'src/app/core/constants/enums';

academicLevelOptions = ACADEMIC_LEVEL_OPTIONS;

columns: ColumnConfig[] = [
  { key: 'c.is_active', label: 'Status', type: 'badge', badgeMap: STATUS_BADGES },
];

rowTransform = (row, mapped) => {
  mapped['c.is_active'] = statusLabel(row.is_active);
  return mapped;
};
```

**Rules**:
- Adding a new allowed value for an existing enum → update the union type + options array + badge/label map in `enums.ts`, nothing else. Backend's validation rules must match.
- Adding a brand-new enum → add a section here, not an inline constant in the consumer.
- No copy-pasting `bg-green-500/10 text-green-700` style badge maps. Use `STATUS_BADGES` (for active/inactive) or add the new map here.

### 3.4 Shared components inventory

All under `shared/components/`:

| Component | Use for |
|---|---|
| `<app-table>` | Every list; pagination, filter, search, sort, audit cols, import/export. Signal input `extraParams` re-fetches on change. |
| `<app-form-field>` | Every form field; `fieldType` = text / email / password / url / number / select / async-select / textarea / checkbox / phone |
| `<app-form-field-phone>` | Standalone phone (also used via `<app-form-field fieldType="phone">`); country picker + digit cap |
| `<app-location-field>` | Location dropdown scoped to header; pass `[recordLocation]` in edit mode |
| `<app-select-dropdown>` | Single / multi, static / async-paginated, optional "Select all" toggle (`showSelectAll`) |
| `<app-breadcrumb>` | Route-derived breadcrumb; drop-in at top of every page |
| `<app-button>` | Styled button wrapper — `impact` (bold/light), `tone` (primary/light/danger), `shape`, `size`, `loading` |
| `<app-loader>` | Spinner — `size`, `text`, `inline` |
| `<app-modal>`, `<app-confirm-dialog>` | Dialog primitives |
| `<app-address>` | Multi-address manager list |
| `<app-file-upload>` | File / image picker + upload; supports deferred upload after parent-record create |

**Rule**: when adding a new form, check this list first. Most widgets already exist.

### 3.5 Permissions UI

Three ways to gate UI:

1. **Directive** (hide-the-element) — `*appHasPermission="['MODULE_CODE', 'ACTION']"`
   ```html
   <app-button *appHasPermission="['USERS', 'CREATE']" (buttonClick)="addNew()">+ New User</app-button>
   ```

2. **Getter on `ps`** (disable-the-element) — `ps.canEdit(code)`, `ps.canDelete(code)`, `ps.canCreate(code)`, `ps.canView(code)`, `ps.canImport(code)`, `ps.canExport(code)`
   ```html
   <app-button [disabled]="!ps.canEdit('USERS')">Save</app-button>
   ```

3. **Table inputs** (drive the row action icons) — pass to `<app-table>`:
   ```html
   <app-table [canEdit]="ps.canEdit('USERS')" [canDelete]="ps.canDelete('USERS')" ...>
   ```
   Table automatically shows / hides the edit, delete, import, export icons.

Module codes (arg for `ps.canXxx`) come from the `settings.modules` table — `USERS`, `LOCATIONS`, `CLASSES`, `ORGANIZATIONS`, `GROUPS`, `MENUS`, `MODULES`, `PERMISSIONS`, `GROUP_MODULES`, `MENU_MODULES`.

### 3.6 Location scoping

[`LocationContextService`](frontend/src/app/core/services/location-context.service.ts) is the single source of truth for the header multiselect. Consumers:

```ts
readonly locationCtx = inject(LocationContextService);

// in a list template:
[extraParams]="locationCtx.scopeExtraParams()"    // { location_ids: '<csv>' | '__none__' }

// in a form:
<app-location-field [formGroup]="form" [submitted]="submitted"
  [recordLocation]="recordLocation()" />         // signal of { id, name, code } or null

// to pre-fill a location field on create:
const preferred = this.locationCtx.preferredLocationId();  // one selected, or user's default
if (preferred) this.form.patchValue({ location_id: preferred });
```

**Semantics**:
- `selectedIds()` = current header selection
- `selectedCsv()` = selection joined with commas (empty string when nothing selected)
- `scopeParam()` = CSV or `'__none__'` sentinel when empty — **always pass this, not `selectedCsv()`**, so the backend treats "nothing selected" as "zero rows" (not "all permitted")
- `scopeExtraParams()` = `{ location_ids: scopeParam() }` — drop-in for `[extraParams]`
- `preferredLocationId()` = best pre-fill choice: single-selection → that one; otherwise user's `is_default` if in selection; otherwise `null`

### 3.7 Signals over BehaviorSubject

All core services (`AuthService`, `PermissionService`, `LocationContextService`, `UserPreferencesService`) are signal-based. Observable facades exist only for legacy subscribers:

- `authService.currentUser` (signal-backed getter) + `currentUser$` (toObservable)
- `permissionService.menus` (getter) + `menus$` (toObservable)

**New code**: read the signal. Don't add new subscriptions to `$` observables unless you're bridging to RxJS operators.

### 3.8 API calls

Always `CommonService`, never raw `HttpClient`. Every URL must come from `core/api/endpoints.ts` — no raw URL string literals anywhere else in the app:

```ts
import { API } from 'src/app/core/api/endpoints';

constructor(private cs: CommonService) {}

this.cs.getService({ url: API.users.base, params: { page: 1, size: 10 } }).subscribe({ /* ... */ });
this.cs.postService({ url: API.users.base, payload }).subscribe({ /* ... */ });
this.cs.putService({ url: API.users.detail(id), payload }).subscribe({ /* ... */ });
this.cs.deleteService({ url: API.users.detail(id) }).subscribe({ /* ... */ });
```

The `endpoints.ts` file mirrors the backend module layout. When the backend renames or reshapes a route, update the one entry in `endpoints.ts` — everything else rides along.

Rules:
- No raw `/users`, `/groups/dropdown`, `/files/${id}`, etc. in component/service code.
- Detail routes are functions so the caller can't forget the id: `API.users.detail(id)`.
- For new endpoints, add a named entry to `endpoints.ts` in the matching module group instead of inlining the string.

Auth headers are attached by the interceptor automatically. Base URL is configured in environment.

**Response shapes** (assume these, don't defensively unwrap):
- Single record: `res.data` is the entity object
- List: `res.data` is the array, `res.pagination` is `{ page, size, total_count, total_pages }`
- Login: `res.access_token`, `res.refresh_token`, `res.user` (special auth shape)
- Relation fields: read nested objects only (for example `organization`, `location`, `group`, `menu`, `module`, `parent`, `employee_category`, `employee_group`, `class_general`), not flat fallback fields.

### 3.9 Types

- `any` is allowed for API responses in components (until typed DTOs land in `shared/models/`)
- Declare interfaces for domain objects: `User`, `Location`, `PermittedMenu`, `PermittedLocation` etc.
- `SelectOption = { value: string; label: string }` — use this for dropdown options
- `ColumnConfig` — defined in `table-filter.service.ts`; use for `columns: ColumnConfig[]`

---

## 4. Backend rules

### 4.1 Module layer convention

Every CRUD module has exactly 4 files:

```
modules/<group>/<entity>/
├── <entity>.routes.js       # Express Router; auth middleware + controller binding
├── <entity>.controller.js   # thin HTTP layer; wrap exports with wrap()
├── <entity>.service.js      # business logic; validation; returns { data } / { error, message }
└── <entity>.repository.js   # DB queries only; no business logic
```

Non-CRUD modules (auth, chat, files, notifications) may omit repository if minimal, but keep controller and service.

### 4.2 Controllers — no try/catch

- **Never** write try/catch in a controller. Use `asyncHandler` via `wrap()`.
- Controllers are thin: pull request data, call service, respond.
- Use `res.success` / `res.created` / `res.handleError`.

```js
const userService = require('./user.service');
const res = require('../../../shared/helpers/response.helper');
const { wrap } = require('../../../shared/middleware/async-handler');

async function getById(req, resp) {
  const result = await userService.getById(req.params.id);
  if (result.error) return res.handleError(resp, result);
  return res.success(resp, { data: result.data });
}

async function create(req, resp) {
  const result = await userService.create(req.body, req.user.id);
  if (result.error) return res.handleError(resp, result);
  return res.created(resp, { data: result.data }, 'User created successfully');
}

module.exports = wrap({ getAll, getById, create, update, remove, removeMultiple });
```

### 4.3 Services — validation + result shape

- Validate first (via `validate.helper`), short-circuit on invalid.
- Return `{ data: ... }` on success, `{ error, message }` on business failure.
- Never throw for expected failures — throw only for unexpected (DB down, bug). The global error handler catches those.

```js
const LEVEL_RULES = {
  location_id: { required: true, label: 'Location' },
  class_general_id: { required: true, label: 'Class' },
  code: { required: true, min: 1, max: 100, label: 'Code' },
  notes: { max: 500, label: 'Notes' },
};

async function create(body, userId) {
  const errors = validate(body, LEVEL_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  const exists = await levelRepo.checkUnique(body.class_general_id, body.code);
  if (exists) return { error: 'conflict', message: 'Code already exists for this class' };

  const level = await levelRepo.create(body, userId);
  return { data: level };
}
```

**Error codes** (map to HTTP via `handleError`):
- `notFound` → 404
- `badRequest` → 400
- `conflict` → 409
- `forbidden` → 403
- `unauthorized` → 401

### 4.4 Repositories — DB only, shared helpers

- Use [`repo.helper.js`](backend/src/shared/helpers/repo.helper.js) for `softDelete`, `softDeleteMultiple`, `checkUnique`.
- Use [`pagination.helper.js`](backend/src/shared/helpers/pagination.helper.js) for list queries.
- Use [`location-scope.helper.js`](backend/src/shared/helpers/location-scope.helper.js) for location-scoped queries.
- Column / table names may be interpolated (hardcoded by dev); all user input goes through parameterized `$1, $2…`.

```js
const repoHelper = require('../../../shared/helpers/repo.helper');
const { paginate } = require('../../../shared/helpers/pagination.helper');
const { applyLocationScope } = require('../../../shared/helpers/location-scope.helper');

const TABLE = 'academic.class_levels';

async function findAll(query, scope) {
  const clauses = [], params = [];

  if (query.class_general_id) {
    clauses.push('cl.class_general_id = ?');
    params.push(query.class_general_id);
  }

  const loc = applyLocationScope({
    column: 'cl.location_id', scope, requested: query.location_ids,
  });
  if (loc.empty) return { data: [], pagination: { page: 1, size: 10, total_count: 0, total_pages: 0 } };
  if (loc.clause) { clauses.push(loc.clause); params.push(...loc.params); }

  return paginate({
    table: TABLE, alias: 'cl',
    selectFields: SELECT_FIELDS, joins: JOINS,
    searchColumns: ['cl.code', 'cl.section', 'cg.name'],
    filterableColumns: ['cl.code', 'cl.section', 'cl.is_active', 'cl.class_general_id'],
    sortableColumns: ['cl.code', 'cl.section', 'cl.capacity', 'cl.is_active', 'cl.created_at'],
    defaultSortBy: 'cl.created_at', defaultSortOrder: 'DESC',
    extraWhere: clauses.join(' AND '), extraWhereParams: params,
  }, query);
}

async function softDelete(id, userId) {
  return repoHelper.softDelete({ table: TABLE, id, userId });
}

async function softDeleteMultiple(ids, userId, scope) {
  return repoHelper.softDeleteMultiple({ table: TABLE, ids, userId, scopeColumn: 'location_id', scope });
}
```

### 4.5 Pagination

Supports:
- Global search (`?search=`) across `searchColumns`
- Per-column filter (`?filter[col.name]=x`) against `filterableColumns` (ILIKE unless boolean)
- Sorting (`?sort_by=col&sort_order=asc`) against `sortableColumns`
- `page`, `size` (capped at 100)
- `extraWhere` with `?` placeholder substitution for module-specific conditions

Every list endpoint returns `{ data: [], pagination: { page, size, total_count, total_pages } }`.

### 4.6 Auth middleware

All in [`auth.middleware.js`](backend/src/shared/middleware/auth.middleware.js):

- `authenticate` — verifies JWT, populates `req.user = { id, username, group_code }`
- `authorizeModule(CODE, ACTION)` — RBAC check (group has `CODE.ACTION` permission)
- `checkModuleView(CODE)` — sets `req.viewOwn = true` if user can only see their own records
- `checkRecordOwnership(TABLE, CODE)` — ensures user is `created_by` or has elevated access (SUPER_ADMIN passes through)

Standard routes file:

```js
router.use(authenticate);

router.get('/',        checkModuleView('USERS'), getAll);
router.get('/:id',     checkRecordOwnership('settings.users', 'USERS'), getById);
router.post('/',       authorizeModule('USERS', 'CREATE'), create);
router.put('/:id',     authorizeModule('USERS', 'EDIT'),   checkRecordOwnership('settings.users', 'USERS'), update);
router.delete('/:id',  authorizeModule('USERS', 'DELETE'), checkRecordOwnership('settings.users', 'USERS'), remove);
router.post('/delete-multiple', authorizeModule('USERS', 'DELETE'), removeMultiple);
```

### 4.7 Location scoping (server)

Defined in [`location-scope.helper.js`](backend/src/shared/helpers/location-scope.helper.js). Rules:

- User's scope comes from `settings.user_locations`. Empty table → `null` (unrestricted, e.g. super admin).
- Lists intersect scope with the `location_ids` query param from the UI.
- Create / update validate `location_id` is in scope.
- `findById` should scope too (use `scopedFindByIdClause`) — a user should 404 instead of seeing another location's record.

```js
const { getUserLocationScope, applyLocationScope, assertLocationAllowed, scopedFindByIdClause } = require('...');

// In service
async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  return repo.findAll(query, scope);
}

async function create(body, userId) {
  // ... validate body ...
  const scope = await getUserLocationScope(userId);
  const err = assertLocationAllowed(scope, body.location_id);
  if (err) return err;
  // ... repo.create ...
}

// In repo findAll (see §4.4 example)
// In repo findById:
async function findById(id, scope) {
  const s = scopedFindByIdClause(scope, 'x.location_id', 2);
  const result = await db.query(`SELECT ... WHERE x.id = $1 AND x.deleted_at IS NULL ${s.clause}`, [id, ...s.params]);
  return result.rows[0] || null;
}
```

**Sentinel**: the frontend sends `location_ids=__none__` when the user has deselected everything. `parseIds` in the helper returns `[]`, which makes the intersect return `[]`, which the repo interprets as "return zero rows".

### 4.8 Response shape

**Single record** (getById, create, update): `{ success, message, data: {...} }`
**List** (getAll): `{ success, message, data: [...], pagination: {...} }`
**Success with no body**: `{ success, message }` (e.g. delete)
**Error**: `{ success: false, message }` with HTTP status

**Relationship object contract (mandatory for CRUD modules):**
- Many-to-one relations MUST be returned as one nested object only (for example `organization`, `location`, `group`, `menu`, `module`, `parent`, `employee_category`, `employee_group`, `class_general`).
- Do NOT return duplicate flat relation fields in API responses (`organization_id`, `organization_name`, `location_name`, `group_name`, etc.).
- Request payloads may still use foreign keys (`organization_id`, `group_id`, `menu_id`, etc.), but response payloads must expose relation data through nested objects only.
- `POST` and `PUT` response shape must match `GET /:id` exactly. Preferred pattern: save, then return `getById(id)`.

Exceptions (kept for semantic reasons):
- `POST /auth/login` — `{ access_token, refresh_token, user }` at top level
- Chat — `{ conversations }`, `{ messages }`, `{ users }`, `{ unread_total }` (multi-value semantics)
- Notifications — `{ notifications, unread_count }`

### 4.9 SQL security

- **Always parameterize values** with `$1, $2...` — never string-concat user input
- **Column and table names** may be interpolated only when they come from a hardcoded dev-controlled value — if a function takes `field` as a parameter, it MUST whitelist the allowed values (see `findByField`)
- **Soft deletes**: every query on tables with `deleted_at` MUST include `AND deleted_at IS NULL`
- **Grep check**: before committing SQL, grep for `${` inside backticked queries — every match must be a hardcoded identifier or a pre-validated placeholder pattern

---

## 5. End-to-end flows

### 5.1 Login & bootstrap

1. User submits login form → `POST /auth/login`
2. Backend: `authService.login(username, password)` — verifies creds, issues JWT
3. Frontend receives `{ access_token, refresh_token, user }`
4. `AuthService.login()` stores tokens + user in localStorage, updates signal
5. User navigates to any route → `AuthGuard.canActivate` runs
6. If `permissionService.loaded === false`:
   - `forkJoin({ permissions: permissionService.load(), locations: locationContext.load() })` — **blocks routing** until both resolve
   - `prefsService.load()` fires & forgets (non-critical)
7. Route activates → layout renders with permission-filtered sidebar + header with location multiselect

### 5.2 Opening a list page

1. Route: `/settings/user` → `UserListComponent` lazily loaded
2. Template renders `<app-table>` with `apiUrl = API.users.base`
3. `TableComponent.ngOnInit` initializes filter service, opens the "initialized" gate
4. Effect fires: reads filter signals + `extraParams` signal → `loadData()`
5. `cs.getService({ url: API.users.base, params: { page, size, filter[...], location_ids, ... } })`
6. Auth interceptor adds `Authorization: Bearer ...` header
7. Backend: `authenticate` → `checkModuleView('USERS')` (sets `req.viewOwn`) → `getAll`
8. Controller: `userService.getAll(req.query, req.viewOwn ? req.user.id : null)`
9. Service: `userRepo.findAll(query, viewOwnUserId)` → paginate SQL
10. Response: `{ success, message, data: [...], pagination: {...} }`
11. Table maps rows via `displayKeyMap` + `rowTransform`, renders
12. User clicks edit icon → table emits `onEdit(row)` → `editSelected(row)` (inherited from BaseListComponent) → `cs.navigate({ url: '/settings/user/{id}/edit' })`

### 5.3 Creating / updating a record

1. Route: `/settings/user/new` or `/settings/user/:id/edit`
2. `UserFormComponent` extends `FormPageBase`
3. `ngOnInit`:
   - `this.form = this.buildForm()`
   - `detectModeAndLoad()`:
     - Reads `id` param → sets `editMode` / `viewMode` / `editId`
     - If `id` present: `GET API.users.detail(id)` → `onRecordLoaded(unwrapResponse(res))` → `form.patchValue` + labels + sticky state
4. User edits the form, clicks Save
5. `onSubmit()`:
   - `submitted = true`
   - `beforeSubmit()` — custom guards (required addresses, selected locations, etc.)
   - `form.invalid` → bail if reactive validators fail
   - `saving = true`; `payload = toPayload()` — may transform value
   - `this.editMode ? cs.putService : cs.postService`
6. Backend: `authenticate` → `authorizeModule('USERS', 'CREATE' | 'EDIT')` → controller
7. Controller: `userService.create(req.body, req.user.id)` or `update(id, body, userId)`
8. Service: `validate` → `assertLocationAllowed` (if location-scoped) → `checkUnique` → `repo.create` / `repo.update`
9. Response: `{ data: {...} }`
10. `afterSave(res)` — default navigates to `listRoute`; override chains file uploads or jumps to a child tab

### 5.4 Changing the header location

1. User opens navbar multiselect, toggles a location
2. `onLocationsChange(values)` → `locationCtx.setSelection(values)`
3. Selection signal updates → persisted to `localStorage` under `locationCtx:{userId}`
4. Every list that has `[extraParams]="locationCtx.scopeExtraParams()"`:
   - Signal change propagates into `TableComponent.extraParams()`
   - Effect re-runs → `loadData()` with new `location_ids`
5. Backend `applyLocationScope` intersects requested with user's scope → returns filtered rows (or zero if `__none__`)
6. Every form with `<app-location-field>`:
   - `locationOptions` computed updates → dropdown reflects the new selection
   - Sticky `recordLocation` (edit mode) keeps the edited record's location visible even if not selected

### 5.5 Adding a brand-new CRUD module

**Backend** (e.g. add a "Subjects" module):

1. `db/migrate.js` — add `CREATE TABLE academic.subjects ...` with `id`, `name`, `code`, `location_id`, `deleted_at`, audit cols
2. `db/seed.js` — add to `modules` array (`{ name: 'Subjects', code: 'SUBJECTS', route_path: '/academic/subject', ... }`), add to `menu_modules` linking to ACADEMIC menu, add to `group_permissions` for SUPER_ADMIN
3. Create `backend/src/modules/academic/subjects/`:
   - `subject.repository.js` — `findAll`, `findById`, `create`, `update`, plus `softDelete` / `softDeleteMultiple` via `repoHelper`. If location-scoped, take `scope` param and use `applyLocationScope`.
   - `subject.service.js` — `validate` rules, business logic, `getUserLocationScope` + `assertLocationAllowed` if location-scoped
   - `subject.controller.js` — thin wrappers, `wrap({ getAll, getById, create, update, remove, removeMultiple })`
   - `subject.routes.js` — `authenticate` + `authorizeModule('SUBJECTS', 'CREATE'|...)` on each route
4. `server.js` — `const subjectRoutes = require('./modules/academic/subjects/subject.routes'); app.use('/api/v1/subjects', subjectRoutes);`

**Frontend**:

1. `core/api/endpoints.ts` — add a `subjects: { base, detail, deleteMultiple, import, dropdown }` group mirroring the backend routes
2. `modules/academic/pages/subject/subject-list/` — extends `BaseListComponent`; `apiUrl = API.subjects.base`, `routeBase = '/academic/subject'`, columns, displayKeyMap
3. `modules/academic/pages/subject/subject-form/` — extends `FormPageBase`; `listRoute = '/academic/subject'`, `resourcePath = API.subjects.base`, `buildForm()` returns reactive form with validators from `V.*`
4. Template: `<app-breadcrumb>`, `<app-button *appHasPermission="['SUBJECTS', 'CREATE']">`, `<app-table ... [extraParams]="locationCtx.scopeExtraParams()" ...>`
5. Route config in the academic module routing — add the two routes
6. Done. Pattern is identical to every other module; if you need anything not covered, revisit this file.

---

## 6. Common pitfalls

- ❌ **Raw `HttpClient` in a component** — use `CommonService`
- ❌ **Raw URL string literals** (`'/users'`, `` `/sessions/${id}/revoke` ``) — import from `core/api/endpoints.ts` as `API.xxx.yyy`
- ❌ **Inline `{ value, label }` option arrays or `Active: { class: 'bg-green-500/10...' }` badge maps** — import from `core/constants/enums.ts`
- ❌ **Local `handleError` or try/catch in controllers** — use `wrap()` + `res.handleError`
- ❌ **Inline `[Validators.required, Validators.minLength(3), Validators.maxLength(100)]`** — use `V.NAME`
- ❌ **New list written from scratch** — extend `BaseListComponent`
- ❌ **New form written from scratch** — extend `FormPageBase`
- ❌ **`res.user` or `res.group`** on single-record responses — use `res.data`
- ❌ **Returning both nested relation objects and flat relation fields** (`organization` + `organization_id` / `organization_name`) — return nested relation objects only
- ❌ **Hardcoded navigation strings in a list** — use `routeBase` + inherited methods
- ❌ **Forgetting `[extraParams]="locationCtx.scopeExtraParams()"`** on a location-scoped list — the data won't filter correctly
- ❌ **Forgetting `ps.canEdit(CODE)`** on action buttons — permission changes are live
- ❌ **Missing `AND deleted_at IS NULL`** on soft-delete tables — zombie rows reappear
- ❌ **SQL string concat with user input** — always parameterize
- ❌ **Skipping `override` keyword** on hook methods — Angular 21 is strict about this
- ❌ **Importing from another `modules/` folder** — hoist shared code to `shared/` or `core/`

---

## 7. Field length & validator reference

Single source of truth for "what's the max length for a name?" — use these.

### Frontend (Angular Validators)

| Concept | Preset (in `shared/validators/common.ts`) | Equivalent validators |
|---|---|---|
| Name (most entities) | `V.NAME` | `required, minLength(3), maxLength(100)` |
| Section / class level name | `V.SHORT_NAME` | `required, minLength(2), maxLength(100)` |
| Class general name | `V.LONG_NAME` | `required, minLength(2), maxLength(200)` |
| Code | `V.CODE` | `required, minLength(3), maxLength(20)` |
| Location code | `V.SHORT_CODE` | `required, minLength(3), maxLength(5)` |
| Registration number / reg_no | `V.maxLength(50)` | `maxLength(50)` |
| Notes | `V.NOTES` | `maxLength(500)` |
| Short description | `V.SHORT_DESCRIPTION` | `maxLength(200)` |
| Email | `V.EMAIL` / `V.REQUIRED_EMAIL` | `[required,] email, maxLength(100)` |
| URL (website / social) | `V.URL` | `maxLength(200), pattern(URL_PATTERN)` |
| Phone | `<app-form-field fieldType="phone">` | Digit cap per-country (10 IN, 10 US, etc.); validates min/max per country |

### Backend (service validation rules)

Mirror the frontend via `validate.helper`:

```js
const LOCATION_RULES = {
  name:             { required: true, min: 3, max: 100, label: 'Name' },
  code:             { required: true, min: 3, max: 5,   label: 'Code' },
  type:             { required: true,                    label: 'Type' },
  email:            { max: 100, email: true,             label: 'Email' },
  notes:            { max: 500,                          label: 'Notes' },
  organization_id:  { required: true,                    label: 'Organization' },
};
```

**Rule**: frontend and backend constraints must match. If you loosen one, loosen both. If you tighten one, tighten both and update existing rows.

---

## Questions?

If this file doesn't answer a question, the answer probably belongs in here. Open a PR adding the rule rather than diverging from it in a one-off module.
