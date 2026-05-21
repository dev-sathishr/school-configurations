# ShaanthiEd — Full Dynamic Engine Architecture
## Frappe-Inspired School Management System

> **Goal:** Replace every static Angular component and hardcoded Express module in the SMS project with a metadata-driven engine. Every form, every list, every workflow is defined as a **DocType** — no module-specific code, ever.

---

## Table of Contents

1. [Vision & Principles](#1-vision--principles)
2. [Current State vs Target State](#2-current-state-vs-target-state)
3. [Core Architecture Overview](#3-core-architecture-overview)
4. [Database Schema — Engine Tables](#4-database-schema--engine-tables)
5. [Phase 1 — Child Tables](#5-phase-1--child-tables)
6. [Phase 2 — Server Scripts](#6-phase-2--server-scripts)
7. [Phase 3 — Client Scripts](#7-phase-3--client-scripts)
8. [Phase 4 — Naming Series](#8-phase-4--naming-series)
9. [Phase 5 — Workflow Engine](#9-phase-5--workflow-engine)
10. [Phase 6 — Depends On & Fetch From](#10-phase-6--depends-on--fetch-from)
11. [Phase 7 — Form Customization & Custom Fields](#11-phase-7--form-customization--custom-fields)
12. [Phase 8 — Print Format Engine](#12-phase-8--print-format-engine)
13. [New Field Types](#13-new-field-types)
14. [DocType Catalog — Full SMS Module List](#14-doctype-catalog--full-sms-module-list)
15. [Frontend Engine Upgrades](#15-frontend-engine-upgrades)
16. [Server Script Examples](#16-server-script-examples)
17. [Client Script Examples](#17-client-script-examples)
18. [API Contract Reference](#18-api-contract-reference)
19. [Sprint Plan](#19-sprint-plan)
20. [Folder Structure — Target](#20-folder-structure--target)
21. [Key Design Decisions](#21-key-design-decisions)
22. [Migration Path from SMS Static Code](#22-migration-path-from-sms-static-code)

---

## 1. Vision & Principles

### What Frappe Got Right

Frappe's genius is separating **what the form does** from **how the form behaves**. Every customisation — field order, validation, auto-fill, workflow — is data, not code. This means:

- A new module = a new DocType definition (JSON/seed), not 4 new Angular components + 4 new Express files
- Business logic lives in **Server Scripts** attached to events, not scattered across services
- UI behaviour lives in **Client Scripts** attached to field events, not hardcoded in components
- Anything that "just stores structured data" needs zero custom code

### Our Principles

| Principle | What it means |
|---|---|
| **Config over code** | Adding a new module = editing `seed-doctypes.js`, not writing components |
| **Scripts over services** | Business rules = Server Scripts; form behaviour = Client Scripts |
| **One API** | All CRUD goes through `/api/v1/engine/records/:doctype` — no module-specific routes |
| **One schema** | All data lives in `engine.*` — no `sms.*`, `master.*`, `base.*` schemas |
| **No compromises** | Zero static components for any business module. Framework components only. |

### What This Replaces

The entire SMS project (130+ tables, 150+ Spring controllers, 100+ Angular components) collapses into:

- **~80 DocType definitions** (JSON in seed file)
- **~50 Server Scripts** (JS attached to DocType events)
- **~30 Client Scripts** (JS for form UI behaviour)
- **~20 Print Formats** (Handlebars HTML templates)
- **~10 Workflow definitions** (state machines for approval flows)

---

## 2. Current State vs Target State

### Current State (`school-configurations` engine)

```
✅ DocType builder (meta + DDL)
✅ Generic CRUD  — GET/POST/PUT/DELETE /engine/records/:doctype
✅ Dynamic form (Angular) — renders fields from DocType config
✅ Dynamic list (Angular) — pagination, filter, sort
✅ Field types: text, email, url, number, date, select, async-select,
               textarea, checkbox, phone, password, file, address, relation-widget
✅ Soft delete, audit columns, location scoping
✅ Permissions (VIEW/CREATE/EDIT/DELETE/IMPORT/EXPORT)

❌ Child Tables (repeatable rows inside a form)
❌ Server Scripts (event-driven backend logic)
❌ Client Scripts (form-level frontend JS)
❌ Naming Series (auto-numbering: ADM-2025-001)
❌ Workflow Engine (Draft → Approved → Active)
❌ Depends On (conditional field visibility)
❌ Fetch From (auto-fill from linked doc)
❌ Form Customization (property overrides per installation)
❌ Custom Fields (add fields without redefining DocType)
❌ Print Formats (Handlebars → PDF)
❌ Rich text / HTML field type
❌ Currency / Percent / Datetime / Time field types
❌ Rating / Color / Signature field types
❌ Section Break / Column Break (layout)
```

### Target State

Everything above checked. Every SMS module defined as DocTypes. No static business module code.

---

## 3. Core Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANGULAR FRONTEND                         │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  DynamicList     │  │  DynamicForm     │  │  DocType     │  │
│  │  Component       │  │  Component       │  │  Studio      │  │
│  │                  │  │  + ChildTable    │  │  (Builder)   │  │
│  │  - pagination    │  │  + ClientScript  │  │              │  │
│  │  - filter/sort   │  │    Runtime       │  │  - Fields    │  │
│  │  - bulk delete   │  │  + Workflow      │  │  - Scripts   │  │
│  │  - import/export │  │    Widget        │  │  - Workflows │  │
│  └──────────────────┘  │  + Print Preview │  │  - Formats   │  │
│                        └──────────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (JWT)
┌──────────────────────────────▼──────────────────────────────────┐
│                       EXPRESS BACKEND                           │
│                                                                 │
│  /engine/records/:doctype   ←── ALL CRUD goes here              │
│  /engine/meta/:doctype      ←── DocType + field definitions     │
│  /engine/client-scripts/:dt ←── Deliver client scripts          │
│  /engine/print/:dt/:id      ←── Render print format → PDF       │
│  /engine/workflow/:dt/:id   ←── Take workflow action            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     records.service.js                    │  │
│  │                                                           │  │
│  │  1. Validate (field rules + server scripts: validate)     │  │
│  │  2. Fire server script: before_insert / before_update     │  │
│  │  3. Resolve naming series → set doc.name / number field   │  │
│  │  4. Save parent record (+ child table rows in txn)        │  │
│  │  5. Fire server script: after_insert / after_update       │  │
│  │  6. Return getById (full nested response)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  ServerScriptRunner │  │  WorkflowEngine                  │  │
│  │  vm.runInContext()  │  │  validateTransition()            │  │
│  │  context:           │  │  applyAction()                   │  │
│  │   doc (mutable)     │  │  logTransition()                 │  │
│  │   frappe helpers    │  └──────────────────────────────────┘  │
│  │   db (read-only)    │                                        │
│  └─────────────────────┘  ┌──────────────────────────────────┐  │
│                           │  PrintFormatEngine               │  │
│                           │  Handlebars.compile(template)    │  │
│                           │  Puppeteer → PDF buffer          │  │
│                           └──────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     POSTGRESQL  (engine schema)                 │
│                                                                 │
│  engine.doctypes            engine.doctype_fields               │
│  engine.server_scripts      engine.client_scripts               │
│  engine.naming_series       engine.naming_series_counters       │
│  engine.workflows           engine.workflow_states              │
│  engine.workflow_actions    engine.workflow_log                 │
│  engine.form_customizations engine.custom_fields                │
│  engine.print_formats                                           │
│                                                                 │
│  engine.enquiries           (auto-created by DDL runner)        │
│  engine.student_profiles    (auto-created by DDL runner)        │
│  engine.employees           (auto-created by DDL runner)        │
│  engine.<every_doctype>     (auto-created by DDL runner)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema — Engine Tables

### 4.1 Existing (keep, minor additions)

```sql
-- Already exists, add new columns
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS is_child_table BOOLEAN DEFAULT false;
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS title_field TEXT;         -- field shown as row title
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS naming_series TEXT;       -- 'ADM-.YYYY.-.####'
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS is_submittable BOOLEAN DEFAULT false;
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS track_changes BOOLEAN DEFAULT true;
ALTER TABLE engine.doctypes ADD COLUMN IF NOT EXISTS quick_entry BOOLEAN DEFAULT false;

-- Already exists, add new columns
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS depends_on TEXT;       -- 'eval:doc.status=="Active"'
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS fetch_from TEXT;       -- 'student_id.full_name'
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS fetch_if_empty BOOLEAN DEFAULT true;
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS in_list_view BOOLEAN DEFAULT false;
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS in_standard_filter BOOLEAN DEFAULT false;
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS bold BOOLEAN DEFAULT false;
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS allow_in_quick_entry BOOLEAN DEFAULT false;
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS collapsible BOOLEAN DEFAULT false;  -- for section-break
ALTER TABLE engine.doctype_fields ADD COLUMN IF NOT EXISTS precision INTEGER DEFAULT 2;        -- for currency/float
```

### 4.2 Server Scripts

```sql
CREATE TABLE IF NOT EXISTS engine.server_scripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  doctype_name TEXT NOT NULL,
  event        TEXT NOT NULL CHECK (event IN (
                 'before_insert','after_insert',
                 'before_update','after_update',
                 'before_delete','after_delete',
                 'validate','on_submit','on_cancel',
                 'on_trash'
               )),
  script       TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_server_scripts_doctype ON engine.server_scripts(doctype_name, event)
  WHERE is_active = true AND deleted_at IS NULL;
```

### 4.3 Client Scripts

```sql
CREATE TABLE IF NOT EXISTS engine.client_scripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  doctype_name TEXT NOT NULL,
  event        TEXT NOT NULL CHECK (event IN (
                 'onload','refresh','before_save','after_save',
                 'on_submit','on_cancel','on_change'
               )),
  field_name   TEXT,       -- NULL = form-level; set = fires on this field's onChange
  script       TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
```

### 4.4 Naming Series

```sql
CREATE TABLE IF NOT EXISTS engine.naming_series (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctype_name TEXT NOT NULL,
  pattern      TEXT NOT NULL,    -- 'ADM-.YYYY.-.LOC.-.####'
  -- tokens: .YYYY. .YY. .MM. .DD. .LOC. .##### (padded digits)
  is_default   BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine.naming_series_counters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id    UUID NOT NULL REFERENCES engine.naming_series(id),
  location_id  UUID,              -- NULL = global counter
  year         SMALLINT,
  month        SMALLINT,
  current_val  INTEGER DEFAULT 0,
  UNIQUE (series_id, location_id, year, month)
);
```

### 4.5 Workflow Engine

```sql
CREATE TABLE IF NOT EXISTS engine.workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctype_name  TEXT NOT NULL UNIQUE,
  state_field   TEXT NOT NULL DEFAULT 'status',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engine.workflow_states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES engine.workflows(id) ON DELETE CASCADE,
  state       TEXT NOT NULL,
  doc_status  SMALLINT DEFAULT 0,   -- 0=Draft 1=Submitted 2=Cancelled
  badge_color TEXT DEFAULT 'gray',
  is_initial  BOOLEAN DEFAULT false,
  is_final    BOOLEAN DEFAULT false,
  UNIQUE (workflow_id, state)
);

CREATE TABLE IF NOT EXISTS engine.workflow_actions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id    UUID NOT NULL REFERENCES engine.workflows(id) ON DELETE CASCADE,
  state          TEXT NOT NULL,           -- must be in when this action
  action         TEXT NOT NULL,           -- button label: "Approve", "Send for Review"
  next_state     TEXT NOT NULL,
  allowed_groups TEXT[],                  -- NULL = everyone; set = specific group codes
  condition      TEXT,                    -- JS: 'doc.fee_paid > 0'
  UNIQUE (workflow_id, state, action)
);

CREATE TABLE IF NOT EXISTS engine.workflow_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctype_name TEXT NOT NULL,
  doc_id       UUID NOT NULL,
  from_state   TEXT,
  to_state     TEXT NOT NULL,
  action       TEXT,
  comment      TEXT,
  done_by      UUID,
  done_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflow_log_doc ON engine.workflow_log(doctype_name, doc_id);
```

### 4.6 Form Customization & Custom Fields

```sql
-- Override base field properties per-installation without touching DocType
CREATE TABLE IF NOT EXISTS engine.form_customizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctype_name TEXT NOT NULL,
  fieldname    TEXT NOT NULL,
  property     TEXT NOT NULL CHECK (property IN (
                 'hidden','reqd','read_only','label','description',
                 'default','options','depends_on','in_list_view',
                 'bold','allow_in_quick_entry','precision'
               )),
  value        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doctype_name, fieldname, property)
);

-- Add fields on top of a core DocType without modifying it
CREATE TABLE IF NOT EXISTS engine.custom_fields (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctype_name   TEXT NOT NULL,
  fieldname      TEXT NOT NULL UNIQUE,
  label          TEXT NOT NULL,
  fieldtype      TEXT NOT NULL,
  insert_after   TEXT,         -- fieldname of existing field this should follow
  options        TEXT,
  required       BOOLEAN DEFAULT false,
  read_only      BOOLEAN DEFAULT false,
  hidden         BOOLEAN DEFAULT false,
  default_value  TEXT,
  description    TEXT,
  depends_on     TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

### 4.7 Print Formats

```sql
CREATE TABLE IF NOT EXISTS engine.print_formats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  doctype_name TEXT NOT NULL,
  html_template TEXT NOT NULL,    -- Handlebars template
  css          TEXT,
  is_default   BOOLEAN DEFAULT false,
  is_landscape BOOLEAN DEFAULT false,
  paper_size   TEXT DEFAULT 'A4' CHECK (paper_size IN ('A4','A5','Letter','Legal')),
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE (doctype_name, name)
);
```

---

## 5. Phase 1 — Child Tables

Child Tables are the most critical missing feature. They unlock Attendance, Mark Entry, Exam Timetable, Invoices, Payroll, and all line-item forms.

### Concept

- A **Child DocType** is a normal DocType with `is_child_table = true`
- A parent DocType field with `fieldtype = 'table'` and `options = 'ChildDoctypeName'` embeds the child
- Child rows are saved in the same DB transaction as the parent
- Child table's physical table gets 3 extra columns: `parent_id`, `parent_doctype`, `idx`

### DDL Runner Changes

```js
// ddl.runner.js — add to createTable()
if (doctype.is_child_table) {
  columns.push('parent_id UUID NOT NULL');
  columns.push('parent_doctype TEXT NOT NULL');
  columns.push('idx INTEGER DEFAULT 0');
  indexes.push(`CREATE INDEX ON engine.${tableName}(parent_id)`);
}
```

### Field Type Mapping Addition

```js
const FIELD_TYPE_MAP = {
  // ... existing ...
  'table':    null,          // no column on parent — handled by child table logic
  'datetime': 'TIMESTAMPTZ',
  'time':     'TIME',
  'currency': 'NUMERIC(15,2)',
  'percent':  'NUMERIC(5,2)',
  'long-text':'TEXT',        // rich HTML
  'code':     'TEXT',
  'color':    'VARCHAR(7)',
  'rating':   'SMALLINT',
  'section-break': null,     // layout only — no DB column
  'column-break':  null,     // layout only — no DB column
  'html':     null,          // static HTML — no DB column
};
```

### Records Service Changes

```js
// records.service.js — create()
async function create(doctypeName, body, userId) {
  const meta = await getMeta(doctypeName);
  const tableFields = meta.fields.filter(f => f.fieldtype === 'table');

  // Separate child table data from parent data
  const childData = {};
  tableFields.forEach(f => {
    childData[f.fieldname] = body[f.fieldname] || [];
    delete body[f.fieldname];
  });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const parent = await insertParent(client, meta, body, userId);

    for (const field of tableFields) {
      const rows = childData[field.fieldname];
      await insertChildRows(client, field.options, parent.id, doctypeName, rows, userId);
    }

    await client.query('COMMIT');
    return getById(doctypeName, parent.id, userId); // returns full doc with children
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### API Response — Parent with Children

```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "date": "2025-06-01",
    "class_level_id": "...",
    "class_level": { "id": "...", "section": "A", "class_general": { "name": "Grade 5" } },
    "attendance_details": [
      { "id": "row-1", "idx": 0, "student_id": "...", "student": { "full_name": "Ravi Kumar" }, "status": "Present" },
      { "id": "row-2", "idx": 1, "student_id": "...", "student": { "full_name": "Priya S" }, "status": "Absent" }
    ]
  }
}
```

---

## 6. Phase 2 — Server Scripts

### VM Sandbox Context

```js
// server-script-runner.js
const vm = require('vm');

async function runServerScript(script, event, doc, userId) {
  const context = {
    doc,       // mutable — changes persist to the saved record
    frappe: {
      throw: (msg) => { throw { isValidationError: true, message: msg }; },
      msgprint: (msg) => { doc.__messages = doc.__messages || []; doc.__messages.push(msg); },
      getNextNumber: (prefix, locationId) => namingSeriesService.getNext(prefix, locationId),
      insertDoc: (doctype, data) => recordsService.create(doctype, data, userId),
      db: {
        getValue: (doctype, filters, field) => recordsRepo.getValue(doctype, filters, field),
        getDoc:   (doctype, id) => recordsService.getById(doctype, id, userId),
        getList:  (doctype, filters, fields) => recordsRepo.getList(doctype, filters, fields),
        exists:   (doctype, filters) => recordsRepo.exists(doctype, filters),
        setDoc:   (doctype, id, data) => recordsService.update(doctype, id, data, userId),
      },
      utils: {
        today: () => new Date().toISOString().split('T')[0],
        now:   () => new Date().toISOString(),
        formatDate: (d, fmt) => dayjs(d).format(fmt),
      }
    }
  };

  vm.createContext(context);
  await vm.runInContext(`(async () => { ${script} })()`, context, { timeout: 5000 });
  return doc;
}
```

### How Scripts Are Invoked

```
HTTP POST /engine/records/Enquiry
        │
        ▼
records.service.create()
        │
        ├─ fire: 'validate'         scripts      ← field-level checks
        ├─ fire: 'before_insert'    scripts      ← set derived fields, naming
        ├─ INSERT into engine.enquiries
        ├─ INSERT child rows
        ├─ fire: 'after_insert'     scripts      ← create linked docs, send notifications
        └─ return getById()
```

### Error Handling

- `frappe.throw('msg')` → caught by records.service → returns `{ error: 'badRequest', message: 'msg' }` → HTTP 400
- Unhandled JS error in script → caught → returns `{ error: 'scriptError', message: err.message }` → HTTP 500
- Timeout (>5s) → `{ error: 'scriptTimeout' }` → HTTP 500

---

## 7. Phase 3 — Client Scripts

### Delivery API

```
GET /api/v1/engine/client-scripts/:doctype
Response:
{
  "scripts": [
    { "event": "onload",    "field_name": null,         "script": "..." },
    { "event": "on_change", "field_name": "class_id",   "script": "..." },
    { "event": "on_change", "field_name": "gender",     "script": "..." }
  ]
}
```

### Angular Runtime (in DynamicFormComponent)

```ts
// dynamic-form.component.ts
class ClientScriptRuntime {
  private handlers: Map<string, Function[]> = new Map();

  load(scripts: ClientScript[]) {
    const frappe = {
      ui: {
        form: {
          on: (doctype: string, handlers: Record<string, Function>) => {
            Object.entries(handlers).forEach(([event, fn]) => {
              const key = event === 'onload' || event === 'refresh' ? event : `field:${event}`;
              if (!this.handlers.has(key)) this.handlers.set(key, []);
              this.handlers.get(key)!.push(fn);
            });
          }
        }
      }
    };
    scripts.forEach(s => {
      try { new Function('frappe', s.script)(frappe); } catch(e) { console.warn('Client script error', e); }
    });
  }

  trigger(event: string, frm: FormContext) {
    (this.handlers.get(event) || []).forEach(fn => fn(frm));
  }
}
```

### `frm` Object Exposed to Scripts

```ts
interface FormContext {
  doc: Record<string, any>;                     // reactive form value (read)
  set_value(field: string, value: any): void;   // patch form control
  set_df_property(field: string, prop: 'hidden'|'reqd'|'read_only', val: boolean|0|1): void;
  set_query(field: string, filters: object): void;  // filter an async-select dropdown
  get_field(fieldname: string): FieldRef;
  call(method: string, args?: object): Promise<any>;  // server method call
  refresh_field(fieldname: string): void;
  clear_table(fieldname: string): void;         // empty a child table
  add_child(fieldname: string, row?: object): void; // add a child table row
}
```

---

## 8. Phase 4 — Naming Series

### Pattern Tokens

| Token | Resolves to |
|---|---|
| `.YYYY.` | 4-digit year: `2025` |
| `.YY.` | 2-digit year: `25` |
| `.MM.` | 2-digit month: `06` |
| `.DD.` | 2-digit day: `01` |
| `.LOC.` | Location code: `MAIN`, `NORTH` |
| `.####` | Zero-padded counter (n digits = n `#`) |

### Examples

```
ADM-.YYYY.-.####      →  ADM-2025-0001
STU-.YYYY.-.LOC.-.###  →  STU-2025-MAIN-042
ATT-.YYYY.-.MM.-.####  →  ATT-2025-06-0001
EMP-.LOC.-.YY.-.##    →  EMP-MAIN-25-03
```

### Service

```js
// naming-series.service.js
async function getNextNumber(doctypeName, locationId) {
  const series = await getDefaultSeries(doctypeName);
  if (!series) return null;

  const key = resolveCounterKey(series, locationId);
  const counter = await incrementCounter(series.id, key.locationId, key.year, key.month);
  return buildSerialNumber(series.pattern, counter, locationId);
}
```

### Integration with Records Service

```js
// records.service.js — before_insert hook
const meta = await getMeta(doctypeName);
if (meta.naming_series) {
  doc[meta.title_field || 'name'] = await namingSeriesService.getNextNumber(doctypeName, doc.location_id);
}
```

---

## 9. Phase 5 — Workflow Engine

### State Machine Flow

```
Enquiry:
  [Draft] ──(Send)──► [Pending Review] ──(Approve)──► [Confirmed] ──(Enroll)──► [Admitted]
                              │                              │
                         (Reject)                       (Reject)
                              │                              │
                              ▼                              ▼
                          [Rejected]                    [Cancelled]

Admission:
  [Draft] ──(Submit)──► [Submitted] ──(Approve)──► [Active]
                              │
                          (Reject)
                              │
                              ▼
                          [Rejected]
```

### API Endpoints

```
GET  /api/v1/engine/workflow/:doctype/:id          — get available actions for current user
POST /api/v1/engine/workflow/:doctype/:id/action   — { action: "Approve", comment: "..." }
GET  /api/v1/engine/workflow/:doctype/:id/history  — full transition log
```

### Workflow Widget (Angular)

```
┌─────────────────────────────────────────────┐
│  Status: [● Pending Review]                 │
│                                             │
│  [Approve]  [Reject]  [Request Info]        │
│                                             │
│  History:                                   │
│  ● 2025-06-01 10:30  Admin → Draft          │
│  ● 2025-06-01 14:15  Principal → Pending    │
└─────────────────────────────────────────────┘
```

---

## 10. Phase 6 — Depends On & Fetch From

### Depends On

Field-level visibility expression. Evaluated in the browser (client scripts runtime) and also enforced server-side.

```js
// DocType field definition
{
  fieldname: 'hostel_room',
  label: 'Hostel Room',
  fieldtype: 'text',
  depends_on: "eval:doc.requires_hostel == true"
}

// Another example
{
  fieldname: 'rejection_reason',
  depends_on: "eval:doc.status == 'Rejected'"
}
```

**Angular**: `DynamicFormComponent` evaluates `depends_on` expressions and hides/shows fields reactively using Angular signals.

**Backend**: Fields with `depends_on` that evaluate to false are stripped from the payload before validation — the engine won't complain about missing required fields that aren't visible.

### Fetch From

Auto-fills a field from a linked document when the link field changes.

```js
// Field definition on Student Profile
{
  fieldname: 'student_name',
  fieldtype: 'read-only',
  fetch_from: 'student_id.full_name',
  fetch_if_empty: false   // always overwrite
}

// When student_id changes → auto-fill student_name from student.full_name
```

**Angular**: `DynamicFormComponent` watches link fields, fetches the linked doc, and patches the `fetch_from` target field.

---

## 11. Phase 7 — Form Customization & Custom Fields

### Form Customization Use Cases

- School A wants "Caste" field hidden on Enquiry form → no code change, just an override record
- School B wants "Hostel Block" to be required → `reqd = true` override
- School C wants "Mother Tongue" field renamed to "First Language" → `label` override

### Customization Merge Logic

```js
// meta.service.js — getDocType()
async function getDocType(name) {
  const base = await getBaseFields(name);
  const customizations = await getCustomizations(name);
  const customFields = await getCustomFields(name);

  // Merge customizations onto base fields
  const merged = base.map(field => {
    const overrides = customizations.filter(c => c.fieldname === field.fieldname);
    overrides.forEach(o => { field[o.property] = parseValue(o.value); });
    return field;
  });

  // Insert custom fields in correct position
  insertCustomFields(merged, customFields);

  return { ...doctype, fields: merged };
}
```

### Custom Fields DDL

When a custom field is activated:
```sql
-- Automatically run by DDL runner when custom field is saved
ALTER TABLE engine.<doctype_table> ADD COLUMN IF NOT EXISTS <fieldname> <type>;
```

---

## 12. Phase 8 — Print Format Engine

### Stack

- **Templates**: Handlebars.js (server-side rendering)
- **PDF Generation**: Puppeteer (headless Chrome → PDF)
- **Data**: Full `getById()` response passed as template context

### Template Variables

```handlebars
<!-- Admission Letter template -->
<h1>{{organization.name}}</h1>
<p>Date: {{formatDate doc.created_at "DD/MM/YYYY"}}</p>

<p>Dear {{doc.parent_name}},</p>
<p>
  We are pleased to inform you that <strong>{{doc.student_name}}</strong>
  has been admitted to <strong>{{doc.class_level.section}}</strong>
  for the academic year <strong>{{doc.academic_year.name}}</strong>.
</p>

<table>
  {{#each doc.documents}}
  <tr><td>{{this.document_type.name}}</td><td>{{this.status}}</td></tr>
  {{/each}}
</table>
```

### Handlebars Helpers Available

| Helper | Usage |
|---|---|
| `formatDate` | `{{formatDate doc.dob "DD/MM/YYYY"}}` |
| `inrCurrency` | `{{inrCurrency doc.fee_amount}}` → `₹1,20,000` |
| `upper` | `{{upper doc.name}}` |
| `ifEq` | `{{#ifEq doc.gender "Male"}}...{{/ifEq}}` |
| `seq` | `{{seq @index}}` → row numbers |

### API Endpoint

```
GET /api/v1/engine/print/:doctype/:id?format=Admission+Letter&download=true
→ Returns PDF stream (Content-Disposition: attachment)
```

---

## 13. New Field Types

Complete updated field type table (new types marked with `🆕`):

| Field Type | DB Column Type | Angular Control |
|---|---|---|
| `text` | `VARCHAR(255)` | `<input type="text">` |
| `email` | `VARCHAR(100)` | `<input type="email">` |
| `url` | `VARCHAR(200)` | `<input type="url">` |
| `number` | `NUMERIC` | `<input type="number">` |
| `currency` 🆕 | `NUMERIC(15,2)` | Number input, displayed with `inrCurrency` pipe |
| `percent` 🆕 | `NUMERIC(5,2)` | Number input with % suffix |
| `date` | `DATE` | Date picker |
| `datetime` 🆕 | `TIMESTAMPTZ` | Date + time picker |
| `time` 🆕 | `TIME` | Time picker |
| `select` | `TEXT` | `<app-select-dropdown>` (static options) |
| `async-select` | `UUID` | `<app-select-dropdown>` (server-paginated) |
| `textarea` | `TEXT` | `<textarea>` |
| `long-text` 🆕 | `TEXT` | Quill rich text editor |
| `code` 🆕 | `TEXT` | Monaco editor (for script fields) |
| `checkbox` | `BOOLEAN` | Toggle |
| `phone` | `TEXT` | Country picker + digit-capped input |
| `password` | `TEXT` | Masked input (bcrypt stored) |
| `file` | `UUID → files` | `<app-file-upload>` |
| `address` | Polymorphic | `<app-address>` multi-address manager |
| `relation-widget` | Junction table | Multi-select with junction rows |
| `table` 🆕 | (child FK) | `<app-child-table>` inline grid |
| `read-only` 🆕 | Same as source | Display-only, not editable, filled via `fetch_from` |
| `color` 🆕 | `VARCHAR(7)` | Color picker (returns hex) |
| `rating` 🆕 | `SMALLINT` | 1–5 star picker |
| `signature` 🆕 | `TEXT` (base64 SVG) | Signature pad |
| `barcode` 🆕 | `TEXT` | Renders a barcode display |
| `section-break` 🆕 | (no column) | `<hr>` + collapsible section header |
| `column-break` 🆕 | (no column) | CSS grid column divider |
| `html` 🆕 | (no column) | Static HTML block (help text, banners) |
| `heading` 🆕 | (no column) | Bold section title (no data) |

---

## 14. DocType Catalog — Full SMS Module List

All 80 DocTypes to seed. Organized by menu group.

---

### 14.1 Settings (existing — already in engine)

| DocType | Display Mode | Notes |
|---|---|---|
| Organizations | page | Already seeded |
| Locations | page | Already seeded |
| Users | page | Already seeded |
| Groups | page | Already seeded |
| Permissions | page | Already seeded |
| Menus | page | Already seeded |
| Modules | page | Already seeded |
| Sequence Codes | page | Already seeded |
| Sequence Controls | page | Already seeded |

---

### 14.2 Master / Reference Data

Simple DocTypes — no child tables, no workflow. Quick to seed.

| DocType | Key Fields | Is Child |
|---|---|---|
| Attendance Type | name, code, color, is_active | No |
| Award Type | name, code, description, is_active | No |
| Caste | name, code, is_active | No |
| Curriculum | name, code (CBSE/ICSE/State Board), is_active | No |
| Document Type | name, code, category, is_mandatory, for_student, for_employee, is_active | No |
| ECA Category | name, code, description, is_active | No |
| Exam Group | name, code, is_active | No |
| Exam Type | name, code, is_active | No |
| Health Parameter Type | name, unit, normal_min, normal_max, is_active | No |
| Holiday Category | name, code, color, is_active | No |
| House | name, code, color, is_active | No |
| Item | name, code, category_id, uom_id, rate, is_active | No |
| Item Category | name, code, is_active | No |
| Memo Category | name, code, is_active | No |
| Memo Type | name, code, is_active | No |
| Notice Type | name, code, is_active | No |
| Fee Category | name, code, description, is_active | No |
| Resource Category | name, code, is_active | No |
| Resource Type | name, code, category_id, is_active | No |
| UOM | name, code, is_active | No |
| Work Category | name, code, is_active | No |
| National Holiday | name, date, holiday_category_id, location_id, is_active | No |

---

### 14.3 Academic Structure

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Academic Year | name, start_date, end_date, location_id, is_default, is_active | None | Naming: `2025-26` |
| Class General | name, code, curriculum_id, academic_level, location_id, is_active | None | |
| Class Level | class_general_id, section, capacity, location_id, is_active | None | Unique: class_general_id + section + location_id |
| Subject General | name, code, curriculum_id, is_active | None | |
| Class Subject Mapping | class_general_id, academic_year_id, location_id | **Subjects** (subject_general_id, is_elective, max_marks, min_marks, weightage) | One per class per year |
| Timetable Period Config | name, start_time, end_time, duration_minutes, location_id | None | Reference master for period slots |
| Timetable | class_level_id, academic_year_id, effective_from, location_id | **Periods** (day_of_week, period_no, subject_id, employee_id, timetable_period_config_id, room) | |

---

### 14.4 Admission Pipeline

| DocType | Key Fields | Child Tables | Workflow |
|---|---|---|---|
| Enquiry | enquiry_no*(naming)*, student_name, dob, gender, parent_name, phone, email, interested_class_id, source, follow_up_date, notes, status, location_id | **Follow-ups** (date, contacted_by_id, outcome, next_follow_up_date) | Draft → In Progress → Converted / Not Interested |
| Registration | reg_no*(naming)*, enquiry_id, student_name, class_general_id, reg_date, reg_fee, fee_paid, assessment_date, status, location_id | **Documents** (document_type_id, file_id, is_verified) | Draft → Assessed → Confirmed / Rejected |
| Admission | admission_no*(naming)*, registration_id, student_name, class_level_id, academic_year_id, date_of_admission, fee_structure_id, status, location_id | **Documents** (document_type_id, file_id, is_verified), **Fee Concessions** (fee_category_id, concession_type, amount) | Draft → Submitted → Active / Withdrawn |

---

### 14.5 Student Management

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Student Profile | student_no*(naming)*, full_name, dob, gender, blood_group, religion, caste_id, mother_tongue, nationality, house_id, class_level_id, academic_year_id, admission_id, roll_number, status, location_id | **Documents** (document_type_id, file_id, is_verified), **Previous Schools** (school_name, board, from_year, to_year, percentage, tc_number), **Siblings** (student_id, relation) | |
| Parent Guardian | full_name, relation_type, gender, phone, alt_phone, email, occupation, employer, annual_income, aadhar_number, is_active | **Addresses** (uses address field type) | Shared across siblings |
| Student Parent Mapping | student_id, parent_id, is_primary_contact, can_pickup, emergency_contact_order | None | Junction |
| Student Leave Request | student_id, from_date, to_date, reason, leave_type, approved_by_id, status | **Attachments** (file_id) | Workflow: Draft → Submitted → Approved/Rejected |
| Student Attendance | class_level_id, academic_year_id, date, taken_by_id, period_no, location_id | **Attendance Rows** (student_id, status[Present/Absent/Late/Excused], remarks) | Naming: ATT-.YYYY.-.MM.-.#### |
| Student Memo | student_id, date, memo_category_id, memo_type_id, subject, body, issued_by_id, parent_acknowledged | **Attachments** (file_id) | |
| Health Record | student_id, date, recorded_by_id, location_id | **Parameters** (parameter_type_id, value, remarks) | |
| Student Assessment (Admission Test) | student_id, registration_id, date, conducted_by_id, total_marks, obtained_marks, result, remarks | None | |
| Photo Gallery | name, academic_year_id, event_name, date, description, location_id | **Photos** (file_id, caption, is_cover) | |
| Promotion | academic_year_id, from_class_id, to_class_id, promoted_by_id, status, location_id | **Students** (student_id, result [Pass/Fail/Detained], remarks, new_class_level_id) | Workflow: Draft → In Progress → Completed |
| Student Discharge | student_id, date, reason, tc_number, issued_by_id, location_id | **Documents** (document_type_id, file_id) | |

---

### 14.6 Employee Management

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Designation | name, code, employee_category_id, is_active | None | |
| Employee Category | name, code, is_active | None | |
| Employee Group | name, code, is_active | None | |
| Employee | emp_no*(naming)*, full_name, dob, gender, blood_group, religion, caste_id, aadhar_number, pan_number, designation_id, category_id, group_id, date_of_joining, probation_end_date, contract_end_date, employment_type, location_id, status | **Qualifications** (degree, institution, year, subject, percentage), **Experience** (employer, designation, from_date, to_date, responsibilities), **Documents** (document_type_id, file_id, is_verified), **Bank Accounts** (bank_name, branch, account_number, ifsc, is_primary), **Family Members** (relation, full_name, dob, phone, is_nominee, nominee_percent) | |
| Employee Attendance | date, location_id, taken_by_id, shift | **Attendance Rows** (employee_id, status[Present/Absent/Half Day/Leave/Holiday], in_time, out_time, overtime_hours, remarks) | |
| Employee Leave Request | employee_id, leave_type, from_date, to_date, reason, approved_by_id, status | **Attachments** (file_id) | Workflow: Draft → Submitted → Approved/Rejected |
| Salary Structure | employee_id, effective_from, effective_to, location_id | **Earnings** (pay_head_id, calculation_type[Fixed/Formula], amount, formula), **Deductions** (pay_head_id, calculation_type, amount, formula) | |

---

### 14.7 Exams & Assessment

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Exam Term | name, academic_year_id, start_date, end_date, is_active | None | |
| Assessment | name, exam_group_id, exam_term_id, academic_year_id, class_general_id, location_id | **Subjects** (subject_general_id, max_marks, pass_marks, weightage, exam_date, start_time, duration_minutes) | |
| Exam Timetable | exam_group_id, exam_term_id, class_general_id, academic_year_id, location_id | **Schedule** (subject_general_id, date, start_time, end_time, room, invigilator_id) | |
| Mark Entry | assessment_id, class_level_id, subject_general_id, entered_by_id, verified_by_id, status | **Marks** (student_id, marks_obtained, is_absent, grade, remarks) | Workflow: Draft → Submitted → Verified |
| Question Group | name, subject_general_id, class_general_id, difficulty[Easy/Medium/Hard], is_active | None | Container for questions |
| Question | question_group_id, question_text, question_type[MCQ/Short/Long/True-False], option_a, option_b, option_c, option_d, correct_option, marks, explanation | None | |
| Question Paper | name, assessment_id, subject_general_id, total_marks, duration_minutes, instructions | **Sections** (title, question_group_id, count, marks_per_question) | |

---

### 14.8 Lesson Planning

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Syllabus | name, subject_general_id, class_general_id, academic_year_id, curriculum_id | **Lessons** (lesson_title, estimated_periods, sequence) | |
| Lesson | name, subject_general_id, class_general_id, period_count, learning_objectives | **Topics** (title, description, estimated_periods), child of Topics → **Sub-topics** (title, content) | Nested child (2 levels) |
| Lesson Plan | employee_id, class_level_id, subject_general_id, date, lesson_id, topic_id, actual_periods, completion_status, remarks | **Resources** (resource_id, description) | |

---

### 14.9 Communication

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Notice Board | title, notice_type_id, publish_date, expiry_date, priority, body_html, target_group_type[All/Students/Employees/Parents/Specific Groups], location_id | **Target Groups** (group_id), **Attachments** (file_id) | |
| Online Meeting | title, date, time, duration_minutes, platform, meeting_link, host_id, description, location_id | **Participants** (person_type[Student/Employee/Parent], person_id) | |
| Memo | memo_no*(naming)*, from_id, date, priority, subject, body_html, location_id | **Recipients** (person_type, person_id, read_at, acknowledged_at) | |

---

### 14.10 Resources & Library

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Resource | name, resource_type_id, category_id, subject_general_id, class_general_id, description, is_public, location_id | **Files** (file_id, version_no, is_current, uploaded_at, notes) | |

---

### 14.11 Transport

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Vehicle | reg_number, brand, model, type, capacity, fuel_type, insurance_expiry, fitness_expiry, location_id, is_active | None | |
| Transport Route | name, code, from_location, to_location, distance_km, location_id, is_active | **Stops** (stop_name, landmark, sequence, arrival_time, departure_time) | |
| Route Vehicle Mapping | route_id, vehicle_id, academic_year_id, driver_id, driver_phone | None | |
| Student Transport Mapping | student_id, route_id, stop_id, academic_year_id, direction[Both/Morning/Evening], fee_amount | None | |
| Transport Attendance | route_id, date, academic_year_id | **Attendance Rows** (student_id, morning_status, evening_status, remarks) | |

---

### 14.12 Events & Activities

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Event | name, event_type_id, from_date, to_date, from_time, to_time, venue, description, organizer_id, location_id | **Participants** (person_type, person_id, role, attended) | |
| Field Visit | name, date, class_level_ids, destination, purpose, coordinator_id, estimated_cost, actual_cost, location_id | **Students** (student_id, attended, fee_paid), **Vehicles** (vehicle_id, driver_name, driver_phone, capacity) | |

---

### 14.13 Finance (Fee Management)

| DocType | Key Fields | Child Tables | Notes |
|---|---|---|---|
| Fee Structure | name, academic_year_id, class_general_id, location_id, is_active | **Fee Lines** (fee_category_id, amount, due_date, is_mandatory, is_refundable) | |
| Fee Collection | receipt_no*(naming)*, student_id, academic_year_id, collection_date, payment_mode[Cash/Online/Cheque/DD], reference_no, collected_by_id, location_id | **Fee Items** (fee_category_id, amount, discount, net_amount, remarks), **Concessions** (concession_type, approved_by_id, amount) | Workflow: Draft → Collected → Cancelled |

---

### 14.14 Child-Only DocTypes (never opened standalone)

| Child DocType | Used In | Key Fields |
|---|---|---|
| Enquiry Follow Up | Enquiry | date, contacted_by_id, outcome, next_follow_up_date |
| Admission Document | Registration, Admission, Student Profile | document_type_id, file_id, is_verified, verified_by_id |
| Previous School | Student Profile | school_name, board, from_year, to_year, percentage, tc_number |
| Sibling Link | Student Profile | student_id (link), relation |
| Qualification | Employee | degree, institution, year, subject, percentage |
| Work Experience | Employee | employer, designation, from_date, to_date |
| Bank Account | Employee | bank_name, branch, account_number, ifsc, is_primary |
| Family Member | Employee | relation, full_name, dob, phone, is_nominee, nominee_percent |
| Attendance Row | Student Attendance, Employee Attendance, Transport Attendance | person_id, status, remarks |
| Mark Row | Mark Entry | student_id, marks_obtained, is_absent, grade, remarks |
| Subject Row | Class Subject Mapping, Assessment | subject_general_id, max_marks, etc. |
| Timetable Period | Timetable | day_of_week, period_no, subject_id, employee_id |
| Exam Schedule Row | Exam Timetable | subject_general_id, date, start_time, room, invigilator_id |
| Fee Line | Fee Structure | fee_category_id, amount, due_date, is_mandatory |
| Fee Item | Fee Collection | fee_category_id, amount, discount, net_amount |
| Photo Row | Photo Gallery | file_id, caption, is_cover |
| Route Stop | Transport Route | stop_name, sequence, arrival_time |
| Notice Target Group | Notice Board | group_id |
| Memo Recipient | Memo | person_type, person_id, read_at |
| Meeting Participant | Online Meeting | person_type, person_id |
| Event Participant | Event | person_type, person_id, role, attended |
| Student Field Visit | Field Visit | student_id, attended, fee_paid |
| Vehicle Field Visit | Field Visit | vehicle_id, driver_name, capacity |
| Promotion Student | Promotion | student_id, result, remarks, new_class_level_id |
| Lesson Resource | Lesson Plan | resource_id, description |
| Print Format Attachment | Fee Collection, Admission | (print trigger records) |

---

## 15. Frontend Engine Upgrades

### 15.1 Child Table Component

```
shared/components/child-table/
├── child-table.component.ts        — outer wrapper with Add Row button
├── child-table.component.html
├── child-table-row/
│   ├── child-table-row.component.ts  — one row, inline or modal edit
│   └── child-table-row.component.html
└── child-table.model.ts
```

**Features:**
- Add / Remove rows
- Inline edit (for simple rows: status, marks)
- Modal edit (for complex rows: qualifications, bank accounts)
- Drag-to-reorder rows (idx update)
- Configurable `in_list_view` columns shown in the grid
- Total row for currency columns

### 15.2 Workflow Widget

```
shared/components/workflow/
├── workflow-widget.component.ts    — state badge + action buttons
├── workflow-history.component.ts   — timeline of transitions
└── workflow.service.ts             — fetchActions(), takeAction()
```

### 15.3 Print Preview

```
shared/components/print-preview/
├── print-preview.component.ts      — toolbar (format selector, download, print)
└── print-frame.component.ts        — iframe showing rendered HTML
```

### 15.4 DocType Studio (Enhanced)

```
modules/engine/
├── doctype-builder/                — existing, add child table + depends_on UI
├── script-editor/
│   ├── server-script-list/
│   ├── server-script-form/         — Monaco editor, event picker, doctype picker
│   ├── client-script-list/
│   └── client-script-form/         — Monaco editor, field picker
├── workflow-designer/
│   ├── workflow-list/
│   └── workflow-form/              — visual state machine (states + actions grid)
├── print-format-editor/
│   ├── print-format-list/
│   └── print-format-form/          — split: HTML editor (Monaco) + live preview iframe
├── customize-form/
│   └── customize-form-page/        — field grid with override inputs per property
└── custom-fields/
    ├── custom-fields-list/
    └── custom-fields-form/
```

### 15.5 Sidebar Menu Seeding

All new modules map to sidebar menus. Menu entries are themselves dynamic (from `settings.modules` table). New groups to add:

```
MASTER     → Attendance Type, Fee Category, Curriculum, House, Document Type, ...
ACADEMIC   → Academic Year, Class, Subject, Class Subject Mapping, Timetable
ADMISSION  → Enquiry, Registration, Admission
STUDENT    → Student Profile, Parent Guardian, Attendance, Leave, Memo, Health
EMPLOYEE   → Employee, Designation, Attendance, Leave
EXAMS      → Assessment, Exam Timetable, Mark Entry, Question Bank
TRANSPORT  → Route, Vehicle, Student Mapping, Attendance
FINANCE    → Fee Structure, Fee Collection
EVENTS     → Notice Board, Event, Memo, Online Meeting, Field Visit
RESOURCES  → Resource
ENGINE     → DocType Studio, Script Editor, Workflow Designer, Print Formats (existing)
```

---

## 16. Server Script Examples

### Auto-generate Admission Number

```javascript
// DocType: Admission | Event: before_insert
const series = await frappe.db.getValue('Naming Series', 
  { doctype_name: 'Admission', location_id: doc.location_id }, 
  'id'
);
doc.admission_no = await frappe.getNextNumber('Admission', doc.location_id);
doc.status = 'Draft';
```

### Create Student Profile After Admission Approved

```javascript
// DocType: Admission | Event: after_update
if (doc.status === 'Active' && !doc.student_id) {
  const student = await frappe.insertDoc('Student Profile', {
    admission_id: doc.id,
    student_name: doc.student_name,
    class_level_id: doc.class_level_id,
    academic_year_id: doc.academic_year_id,
    location_id: doc.location_id,
    status: 'Active'
  });
  doc.student_id = student.id;
}
```

### Validate Mark Entry Against Max Marks

```javascript
// DocType: Mark Entry | Event: validate
for (const row of doc.marks_rows) {
  if (row.is_absent) {
    row.marks_obtained = 0;
    continue;
  }
  const subjectLine = await frappe.db.getValue(
    'Assessment Subject Row',
    { parent_id: doc.assessment_id, subject_general_id: doc.subject_general_id },
    'max_marks'
  );
  if (row.marks_obtained > subjectLine) {
    frappe.throw(`Row ${row.idx + 1}: Marks ${row.marks_obtained} exceed maximum ${subjectLine}`);
  }
  // Auto-calculate grade
  const percent = (row.marks_obtained / subjectLine) * 100;
  row.grade = percent >= 90 ? 'A+' : percent >= 80 ? 'A' : percent >= 70 ? 'B' : percent >= 60 ? 'C' : percent >= 40 ? 'D' : 'F';
}
```

### Attendance Auto-fill from Class

```javascript
// DocType: Student Attendance | Event: before_insert
if (!doc.attendance_rows || doc.attendance_rows.length === 0) {
  const students = await frappe.db.getList('Student Profile', {
    class_level_id: doc.class_level_id,
    academic_year_id: doc.academic_year_id,
    status: 'Active'
  }, ['id', 'student_no', 'full_name', 'roll_number']);

  doc.attendance_rows = students.map((s, i) => ({
    idx: i,
    student_id: s.id,
    status: 'Present',  // default present
    remarks: ''
  }));
}
```

### Fee Receipt Numbering

```javascript
// DocType: Fee Collection | Event: before_insert
doc.receipt_no = await frappe.getNextNumber('Fee Collection', doc.location_id);
doc.status = 'Collected';
```

### Prevent Duplicate Attendance

```javascript
// DocType: Student Attendance | Event: validate
const existing = await frappe.db.exists('Student Attendance', {
  class_level_id: doc.class_level_id,
  date: doc.date,
  period_no: doc.period_no
});
if (existing && existing !== doc.id) {
  frappe.throw(`Attendance for this class and period on ${doc.date} already exists`);
}
```

---

## 17. Client Script Examples

### Enquiry — Auto-format follow-up date

```javascript
frappe.ui.form.on('Enquiry', {
  onload: function(frm) {
    if (!frm.doc.follow_up_date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      frm.set_value('follow_up_date', tomorrow.toISOString().split('T')[0]);
    }
    if (frm.doc.status === 'Converted') {
      frm.set_df_property('status', 'read_only', 1);
    }
  }
});
```

### Student Profile — Conditional fields

```javascript
frappe.ui.form.on('Student Profile', {
  onload: function(frm) {
    toggleTransportFields(frm);
    toggleHostelFields(frm);
  },
  requires_transport: function(frm) { toggleTransportFields(frm); },
  requires_hostel: function(frm) { toggleHostelFields(frm); },
});

function toggleTransportFields(frm) {
  const show = frm.doc.requires_transport;
  ['route_id', 'stop_id', 'transport_direction'].forEach(f =>
    frm.set_df_property(f, 'hidden', !show)
  );
}

function toggleHostelFields(frm) {
  const show = frm.doc.requires_hostel;
  ['hostel_block', 'room_number'].forEach(f =>
    frm.set_df_property(f, 'hidden', !show)
  );
}
```

### Class Subject Mapping — Filter subjects by curriculum

```javascript
frappe.ui.form.on('Class Subject Mapping', {
  class_general_id: async function(frm) {
    if (!frm.doc.class_general_id) return;
    const cls = await frappe.db.getDoc('Class General', frm.doc.class_general_id);
    frm.set_query('subject_general_id', {
      filters: { curriculum_id: cls.curriculum_id, is_active: true }
    });
  }
});
```

### Mark Entry — Live percentage calculation

```javascript
frappe.ui.form.on('Mark Entry', {
  onload: function(frm) {
    frm.fields_dict.marks_rows.on_row_change = function(row) {
      if (row.max_marks && row.marks_obtained !== null) {
        row.percentage = ((row.marks_obtained / row.max_marks) * 100).toFixed(1);
        frm.refresh_field('marks_rows');
      }
    };
  }
});
```

### Admission — Fetch student name from registration

```javascript
frappe.ui.form.on('Admission', {
  registration_id: async function(frm) {
    if (!frm.doc.registration_id) return;
    const reg = await frappe.db.getDoc('Registration', frm.doc.registration_id);
    frm.set_value('student_name', reg.student_name);
    frm.set_value('class_general_id', reg.class_general_id);
  }
});
```

---

## 18. API Contract Reference

### Core Engine Endpoints (all modules use these — no module-specific routes)

```
# Metadata
GET    /api/v1/engine/meta/:doctype              — field definitions + customizations merged
GET    /api/v1/engine/meta                       — list all doctypes

# Records
GET    /api/v1/engine/records/:doctype           — list with pagination, filter, sort
GET    /api/v1/engine/records/:doctype/:id       — single record with nested relations + children
POST   /api/v1/engine/records/:doctype           — create (fires server scripts)
PUT    /api/v1/engine/records/:doctype/:id       — update (fires server scripts)
DELETE /api/v1/engine/records/:doctype/:id       — soft delete
POST   /api/v1/engine/records/:doctype/delete-multiple — bulk soft delete

# Client Scripts
GET    /api/v1/engine/client-scripts/:doctype    — all active client scripts for doctype

# Workflow
GET    /api/v1/engine/workflow/:doctype/:id      — available actions for current user + state
POST   /api/v1/engine/workflow/:doctype/:id/action — { action, comment }
GET    /api/v1/engine/workflow/:doctype/:id/history — transition log

# Print
GET    /api/v1/engine/print/:doctype/:id         — ?format=<name>&download=true → PDF

# DocType Studio
GET    /api/v1/engine/doctypes                   — list all doctypes
POST   /api/v1/engine/doctypes                   — create doctype
PUT    /api/v1/engine/doctypes/:id               — update doctype
POST   /api/v1/engine/doctypes/:id/activate      — run DDL, set table_status=active

# Scripts
GET    /api/v1/engine/server-scripts             — list
POST   /api/v1/engine/server-scripts             — create
PUT    /api/v1/engine/server-scripts/:id         — update
DELETE /api/v1/engine/server-scripts/:id         — delete

GET    /api/v1/engine/client-scripts-meta        — list (management)
POST   /api/v1/engine/client-scripts-meta        — create
PUT    /api/v1/engine/client-scripts-meta/:id    — update

# Naming Series
GET    /api/v1/engine/naming-series              — list
POST   /api/v1/engine/naming-series              — create
GET    /api/v1/engine/naming-series/preview/:doctype — preview next number

# Workflow Designer
GET    /api/v1/engine/workflows                  — list
POST   /api/v1/engine/workflows                  — create with states + actions
PUT    /api/v1/engine/workflows/:id              — update

# Print Format
GET    /api/v1/engine/print-formats              — list
POST   /api/v1/engine/print-formats              — create
PUT    /api/v1/engine/print-formats/:id          — update

# Form Customization
GET    /api/v1/engine/customize-form/:doctype    — all overrides for doctype
POST   /api/v1/engine/customize-form             — create/update override
DELETE /api/v1/engine/customize-form/:id         — remove override

# Custom Fields
GET    /api/v1/engine/custom-fields/:doctype     — list
POST   /api/v1/engine/custom-fields              — create + run ALTER TABLE
PUT    /api/v1/engine/custom-fields/:id          — update
DELETE /api/v1/engine/custom-fields/:id          — soft delete
```

### Response Shape (unchanged from existing engine)

```json
// Single record
{ "success": true, "message": "...", "data": { ...fields, ...nested_objects, ...child_arrays } }

// List
{ "success": true, "data": [...], "pagination": { "page": 1, "size": 20, "total_count": 150, "total_pages": 8 } }

// Error
{ "success": false, "message": "Validation error: Marks exceed maximum" }  // HTTP 400
```

---

## 19. Sprint Plan

### Sprint 1 — Child Tables (2 weeks)

**Backend:**
- [ ] Extend `engine.doctypes` with `is_child_table`, `title_field`
- [ ] Extend `engine.doctype_fields` with `depends_on`, `fetch_from`, `in_list_view`
- [ ] Update DDL runner: `table` field type → no column; child table tables get `parent_id`, `parent_doctype`, `idx`
- [ ] Update `records.service.js`: split payload by field type, transaction-wrap parent + child saves
- [ ] Update `records.repository.js`: `getById` fetches all child rows and nests them
- [ ] API response: child rows as arrays keyed by fieldname

**Frontend:**
- [ ] `<app-child-table>` component: grid display, Add/Remove rows, `in_list_view` columns
- [ ] `<app-child-table-row-modal>`: opens a `DynamicForm` for the child DocType
- [ ] `DynamicFormComponent`: detect `fieldtype === 'table'`, render `<app-child-table>`
- [ ] Payload assembly: collect child table values and include in form submit

**Test DocTypes:**
- [ ] Seed `Enquiry` + `Enquiry Follow Up` child table
- [ ] Seed `Student Attendance` + `Attendance Row` child table

---

### Sprint 2 — Server Scripts (1.5 weeks)

**Backend:**
- [ ] Create `engine.server_scripts` table + migration
- [ ] `server-script-runner.js`: vm sandbox, context object (doc, frappe, db)
- [ ] Integrate into `records.service.js`: fire scripts at `validate`, `before_insert`, `after_insert`, `before_update`, `after_update`, `before_delete`
- [ ] Error handling: `frappe.throw` → 400, `frappe.msgprint` → response `__messages`
- [ ] CRUD API for server scripts (`/engine/server-scripts`)

**Frontend:**
- [ ] Server Script list (standard dynamic list)
- [ ] Server Script form: Monaco editor, event dropdown, doctype dropdown, is_active toggle
- [ ] Add "Server Scripts" link to Engine sidebar section

---

### Sprint 3 — Client Scripts (1.5 weeks)

**Backend:**
- [ ] Create `engine.client_scripts` table + migration
- [ ] `GET /engine/client-scripts/:doctype` endpoint
- [ ] CRUD API for client scripts

**Frontend:**
- [ ] `ClientScriptRuntime` class in `DynamicFormComponent`
- [ ] Fetch client scripts on form init, run `onload` immediately
- [ ] Trigger `on_change` scripts when form control value changes
- [ ] `frm` context object: `set_value`, `set_df_property`, `set_query`, `call`, `refresh_field`
- [ ] Client Script form: Monaco editor, event dropdown, field picker (for `on_change`)

---

### Sprint 4 — Naming Series (1 week)

**Backend:**
- [ ] Create `engine.naming_series` + `engine.naming_series_counters` tables
- [ ] `naming-series.service.js`: pattern parser, counter increment (atomic SELECT FOR UPDATE)
- [ ] Integrate into `records.service.js`: auto-set naming field before insert
- [ ] CRUD API + preview endpoint

**Frontend:**
- [ ] Naming Series list + form (standard dynamic)
- [ ] Preview panel: shows next generated number in real time

---

### Sprint 5 — Workflow Engine (2 weeks)

**Backend:**
- [ ] Create workflow tables (workflows, states, actions, log)
- [ ] `workflow.service.js`: `getAvailableActions(doctypeName, docId, userId)`, `takeAction(doctypeName, docId, action, comment, userId)`
- [ ] Permission check: compare `allowed_groups` with user's group
- [ ] Condition evaluation: `vm.runInContext(condition, { doc })`
- [ ] Update `records.service.js`: on update, check if state field changed → validate via workflow
- [ ] API: `/engine/workflow/:doctype/:id` GET actions; POST action; GET history

**Frontend:**
- [ ] `<app-workflow-widget>` component: state badge, action buttons
- [ ] `<app-workflow-history>` component: timeline
- [ ] `DynamicFormComponent`: detect if doctype has workflow, inject widget
- [ ] Workflow Designer form: states grid, actions grid (in Engine module)

---

### Sprint 6 — Depends On + Fetch From (1 week)

**Backend:**
- [ ] `validate` strips fields where `depends_on` evaluates to false (using vm)
- [ ] `fetch_from` resolved on `getById` response (or via a `GET /engine/fetch-from` endpoint)

**Frontend:**
- [ ] `DynamicFormComponent`: eval `depends_on` expressions reactively (Angular signals)
- [ ] `DynamicFormComponent`: watch link field changes, call fetch-from API, patch target fields

---

### Sprint 7 — Form Customization + Custom Fields (1 week)

**Backend:**
- [ ] Create `engine.form_customizations` + `engine.custom_fields` tables
- [ ] `meta.service.js`: merge customizations + custom fields into `getDocType` response
- [ ] Custom fields DDL: `ALTER TABLE engine.<table> ADD COLUMN` on save
- [ ] CRUD APIs for both

**Frontend:**
- [ ] Customize Form page: displays all fields of a DocType with property override inputs
- [ ] Custom Fields form: select DocType, add field, pick insert_after position

---

### Sprint 8 — Print Formats (1.5 weeks)

**Backend:**
- [ ] Install: `puppeteer`, `handlebars`
- [ ] `print-format.service.js`: compile template, inject data from `getById`, run Puppeteer
- [ ] Register Handlebars helpers: `formatDate`, `inrCurrency`, `upper`, `ifEq`, `seq`
- [ ] `GET /engine/print/:doctype/:id` → PDF stream
- [ ] CRUD API for print formats

**Frontend:**
- [ ] Print Format form: Monaco HTML editor (left) + live iframe preview (right)
- [ ] CSS panel for per-format styles
- [ ] `<app-print-preview>` component with format selector + download button
- [ ] Inject print button into DynamicForm header when doctype has a default print format

---

### Sprint 9 — New Field Types (1 week)

- [ ] `datetime`, `time` — date-time/time pickers
- [ ] `currency`, `percent` — number inputs with formatters
- [ ] `long-text` — Quill integration in DynamicForm
- [ ] `section-break`, `column-break` — layout rendering in DynamicForm
- [ ] `rating` — star picker component
- [ ] `color` — color picker component
- [ ] `read-only` — display-only field

---

### Sprint 10–13 — DocType Seeding (4 weeks)

One sprint per domain:

| Sprint | DocTypes to Seed |
|---|---|
| 10 | All 22 Master/Reference DocTypes + Academic Structure (7) |
| 11 | Admission Pipeline (3) + Student Management (11) + all child doctypes |
| 12 | Employee (7) + Exams & Assessment (7) + Lesson Planning (3) |
| 13 | Communication (3) + Transport (5) + Events (2) + Finance (2) |

For each DocType:
1. Field definitions (in `seed-doctypes.js`)
2. DDL activation
3. Module + menu entry in seed
4. Group permission seed
5. Server Scripts for business logic
6. Client Scripts for UI behaviour
7. Naming Series (if needed)
8. Workflow definition (if needed)
9. Print Format HTML template (if needed)

---

### Sprint 14 — DocType Studio UI Polish (1 week)

- [ ] Drag-and-drop field reordering in DocType builder
- [ ] Workflow visual designer (state bubbles + action arrows)
- [ ] Script editor with syntax highlighting (Monaco) + test-run button
- [ ] Print format live preview with real sample data
- [ ] Customize Form diff view (shows base vs overridden)

---

## 20. Folder Structure — Target

```
school-configurations/
└── backend/src/
    ├── modules/
    │   ├── engine/
    │   │   ├── ddl/
    │   │   │   └── ddl.runner.js                  ← updated: new field types, child DDL
    │   │   ├── meta/
    │   │   │   ├── meta.service.js                ← updated: merge customizations + custom fields
    │   │   │   ├── meta.repository.js
    │   │   │   ├── meta.controller.js
    │   │   │   └── meta.routes.js
    │   │   ├── records/
    │   │   │   ├── records.service.js             ← updated: scripts, child tables, naming
    │   │   │   ├── records.repository.js          ← updated: child fetch, child save
    │   │   │   ├── records.controller.js
    │   │   │   └── records.routes.js
    │   │   ├── server-scripts/                    ← NEW
    │   │   │   ├── server-script.runner.js
    │   │   │   ├── server-script.service.js
    │   │   │   ├── server-script.repository.js
    │   │   │   ├── server-script.controller.js
    │   │   │   └── server-script.routes.js
    │   │   ├── client-scripts/                    ← NEW
    │   │   │   ├── client-script.service.js
    │   │   │   ├── client-script.repository.js
    │   │   │   ├── client-script.controller.js
    │   │   │   └── client-script.routes.js
    │   │   ├── naming-series/                     ← NEW
    │   │   │   ├── naming-series.service.js
    │   │   │   ├── naming-series.repository.js
    │   │   │   ├── naming-series.controller.js
    │   │   │   └── naming-series.routes.js
    │   │   ├── workflow/                          ← NEW
    │   │   │   ├── workflow.engine.js
    │   │   │   ├── workflow.service.js
    │   │   │   ├── workflow.repository.js
    │   │   │   ├── workflow.controller.js
    │   │   │   └── workflow.routes.js
    │   │   ├── print/                             ← NEW
    │   │   │   ├── print-format.service.js
    │   │   │   ├── print-format.repository.js
    │   │   │   ├── print-format.controller.js
    │   │   │   └── print-format.routes.js
    │   │   ├── customize-form/                    ← NEW
    │   │   │   ├── customize-form.service.js
    │   │   │   ├── customize-form.controller.js
    │   │   │   └── customize-form.routes.js
    │   │   └── custom-fields/                     ← NEW
    │   │       ├── custom-fields.service.js
    │   │       ├── custom-fields.controller.js
    │   │       └── custom-fields.routes.js
    │   └── settings/                              ← unchanged
    └── db/
        ├── migrate.js                             ← add new engine tables
        └── seed-doctypes.js                       ← add all 80 DocType definitions

frontend/src/app/
    ├── shared/components/
    │   ├── child-table/                           ← NEW
    │   ├── workflow/                              ← NEW
    │   └── print-preview/                         ← NEW
    └── modules/
        ├── dynamic/
        │   ├── dynamic-form/                      ← updated: child tables, scripts, workflow
        │   └── dynamic-list/                      ← updated: depends_on filters
        └── engine/
            ├── doctype-builder/                   ← updated: new field types, drag-drop
            ├── script-editor/                     ← NEW (server + client scripts)
            ├── workflow-designer/                 ← NEW
            ├── print-format-editor/               ← NEW
            ├── customize-form/                    ← NEW
            └── custom-fields/                     ← NEW
```

---

## 21. Key Design Decisions

### Decision 1: Dynamic Table Creation vs JSONB vs EAV

| Approach | Query speed | Flexibility | Migration complexity |
|---|---|---|---|
| **Dynamic tables** (our choice) | ✅ Fast (real SQL indexes) | ✅ Full SQL | ⚠️ ALTER TABLE per field |
| JSONB single table | ⚠️ Slower (JSON path queries) | ✅ No DDL | ✅ None |
| EAV | ❌ Very slow (pivot) | ✅ No DDL | ✅ None |

**Chosen: Dynamic tables.** Same as Frappe. Real PostgreSQL tables per DocType means reports are clean SQL, indexes work natively, and the query model is standard. The `ALTER TABLE` cost on adding a field is milliseconds on an empty or small table.

### Decision 2: Single `engine` Schema

All data — whether it's a Permission or a Student Profile — lives in `engine.*`. No `sms.*`, `master.*`, `student.*` schemas. Benefits:

- One connection, one schema search path
- `records.service.js` doesn't need to know which schema a DocType belongs to
- Migrations are simpler — one schema to manage

### Decision 3: Server Scripts in Node.js `vm`, Not in a Separate Process

Frappe uses Python `eval`. We use Node.js `vm.runInContext`. Tradeoffs:

- `vm` shares the same Node process → fast, no IPC overhead
- `vm` is NOT a security sandbox (it can escape with `this.constructor.constructor`)
- Mitigation: all scripts are written by admins (not end users), `timeout: 5000ms` prevents infinite loops
- Future: move to `isolated-vm` (V8 Isolates) if untrusted script execution is needed

### Decision 4: No Static Business Module Code, Ever

The rule is absolute. If something feels too complex for the engine (multi-step wizard, custom report), the answer is:

1. Break it into smaller DocTypes that the engine handles
2. Write a Server Script for the orchestration logic
3. Write a Client Script for the UI behaviour
4. Write a Print Format for output

If all three fail, the feature needs a discussion about whether it belongs in the engine or is truly a one-off (e.g., a payroll computation engine). The default answer is always "engine first."

### Decision 5: Permissions Stay Per-Module (Group Module Mapping)

DocType permissions are inherited from their module's group-module mapping. Every DocType seed includes a `module_code` that links it to the permission system. The existing `authorizeModule(CODE, ACTION)` middleware continues to work — we just seed more modules.

---

## 22. Migration Path from SMS Static Code

The SMS project (Spring Boot + Angular 18) does **not** need to be migrated file-by-file. The strategy is:

### Step 1: New Project, Same Data

Use the `school-configurations` engine as the new codebase. The SMS PostgreSQL database schema is reference material — we redefine the same concepts as DocTypes, not as JPA entities.

### Step 2: Migrate Master Data First

Simple lookup tables (Attendance Type, Fee Category, Curriculum, etc.) have no business logic. These become DocTypes in Sprint 10 and can be populated by:
- Direct `INSERT` from SMS database export
- Or re-entered via the new DocType form

### Step 3: Seed Critical DocTypes with Server Scripts

For each complex module (Student, Admission, Employee), the Spring Boot `@Service` logic becomes a Server Script on the equivalent DocType. The business rules are transcribed from Java to JavaScript, not auto-migrated.

### Step 4: Run in Parallel During Transition

SMS system continues to run for live data. New engine is developed and tested with a copy of the data. Cutover happens module by module:
- Master data → immediate (no workflow, no risk)
- Admission pipeline → after Sprint 5 (workflow done)
- Student module → after Sprint 11 (student DocTypes seeded)
- Employee → after Sprint 12
- Finance → after Sprint 13

### Step 5: Decommission SMS

Once all modules are live in the engine and data is migrated, the Spring Boot project is archived.

---

*Document version: 1.0 — 2025-05-20*
*Author: Sathish R — Shaanthi Education*
*This is the authoritative architecture document. Update it before changing the engine, not after.*
