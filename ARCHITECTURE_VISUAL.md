# Dynamic SMS — Visual Architecture Guide
# End-to-End: Login → Every Feature

---

## 1. THE BIG PICTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Angular 18)                               │
│                                                                             │
│   ┌─────────────┐    ┌──────────────────┐    ┌────────────────────────┐   │
│   │   Sidebar   │    │  Dynamic LIST    │    │   Dynamic FORM         │   │
│   │  (menus     │    │  Component       │    │   Component            │   │
│   │  from DB)   │    │  /d/:doctype     │    │   /d/:doctype/:id      │   │
│   └──────┬──────┘    └────────┬─────────┘    └──────────┬─────────────┘   │
│          │                   │                          │                  │
│          └───────────────────┴──────────────────────────┘                  │
│                              │ HTTP + JWT                                   │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SPRING BOOT — ENGINE API                               │
│                                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    EngineController (ONE controller)               │   │
│   │  GET  /engine/meta/:doctype          → DocType definition          │   │
│   │  GET  /engine/records/:doctype       → Paginated list              │   │
│   │  POST /engine/records/:doctype       → Create record               │   │
│   │  PUT  /engine/records/:doctype/:id   → Update record               │   │
│   │  DELETE /engine/records/:doctype/:id → Soft delete                 │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│   ┌──────────────┐  ┌────────┴──────┐  ┌──────────────┐  ┌─────────────┐ │
│   │DocTypeRegist-│  │EngineService  │  │SchemaManager │  │ServerScript │ │
│   │ry (cache)    │  │(orchestrate)  │  │(CREATE TABLE)│  │Executor     │ │
│   └──────────────┘  └───────────────┘  └──────────────┘  └─────────────┘ │
│                              │                                              │
│   ┌──────────────────────────┴──────────────────────────────────────────┐  │
│   │              NamingSeriesService │ WorkflowEngine │ PrintRenderer   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL DATABASE                                 │
│                                                                             │
│  ┌──────────────────────────────┐   ┌────────────────────────────────────┐ │
│  │     engine.* (Config)        │   │   dynamic.* (Actual Records)       │ │
│  │                              │   │                                    │ │
│  │  engine.doctypes             │   │  dynamic.admission                 │ │
│  │  engine.doctype_fields       │   │  dynamic.student                   │ │
│  │  engine.server_scripts       │   │  dynamic.student_attendance        │ │
│  │  engine.client_scripts       │   │  dynamic.fee_schedule              │ │
│  │  engine.naming_series        │   │  dynamic.mark_entry                │ │
│  │  engine.workflows            │   │  dynamic.timetable                 │ │
│  │  engine.workflow_states      │   │  dynamic.memo                      │ │
│  │  engine.print_formats        │   │  dynamic.salary_slip               │ │
│  │  engine.reports              │   │  ... (one table per DocType)       │ │
│  └──────────────────────────────┘   └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. WHAT IS A DOCTYPE?

```
DocType = Blueprint (like a class definition)
Record  = Actual data (like an object instance)

┌─────────────────────────────────────────────────┐
│         DOCTYPE: "Admission"  (Blueprint)        │
│                                                 │
│  Field Name        Type        Required?        │
│  ──────────────    ────────    ─────────        │
│  student_name      Text        Yes              │
│  date_of_birth     Date        Yes              │
│  class_applying    Link→Class  Yes              │
│  parent_name       Text        Yes              │
│  contact_phone     Phone       Yes              │
│  has_scholarship   Check       No               │
│  scholarship_amt   Currency    No               │
│  notes             Textarea    No               │
│  status            Select      Yes              │
│                                                 │
│  Naming Series:  ADM-.YYYY.-.####              │
│  Workflow:       Admission Workflow             │
│  Location Scope: Yes                           │
└─────────────────────────────────────────────────┘
         │
         │  Engine reads this → creates table
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│    TABLE: dynamic.admission  (Auto-created by SchemaManager)                │
│                                                                             │
│  id  │ name         │student_name│date_of_birth│class_applying│status      │
│  ────┼──────────────┼────────────┼─────────────┼──────────────┼──────────  │
│  1   │ADM-2025-0001 │Arjun Kumar │2015-06-15   │Class 5-A     │Admitted    │
│  2   │ADM-2025-0002 │Priya Singh │2016-02-20   │Class 4-B     │Applied     │
│  3   │ADM-2025-0003 │Ravi Das    │2015-11-05   │Class 5-A     │Draft       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. LOGIN FLOW

```
User Opens Browser
      │
      ▼
┌─────────────┐
│  Login Page │  username + password
└──────┬──────┘
       │ POST /api/v1/auth/login
       ▼
┌──────────────────────────────┐
│  Spring Boot Auth Service    │
│  1. Verify credentials       │
│  2. Issue JWT token          │
│  3. Return user + token      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Angular AuthService stores:                         │
│  localStorage["access_token"] = "eyJhbGci..."        │
│  localStorage["user"] = { id, name, group_code }     │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Bootstrap (parallel API calls):                     │
│                                                      │
│  GET /me/permissions  →  What can I do?              │
│  GET /me/locations    →  Which branches?             │
│  GET /me/menus        →  What menus to show?         │
└──────────────┬───────────────────────────────────────┘
               │  All loaded
               ▼
┌──────────────────────────────────────────────────────┐
│  Dashboard rendered                                  │
│                                                      │
│  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │ SIDEBAR  │  │  Dashboard                       │ │
│  │          │  │  ┌──────┐ ┌──────┐ ┌──────┐     │ │
│  │ Admission│  │  │Total │ │Today │ │Fee   │     │ │
│  │ Student  │  │  │Students│Attend│ │Due   │     │ │
│  │ Academic │  │  └──────┘ └──────┘ └──────┘     │ │
│  │ Attendance│ │                                  │ │
│  │ Finance  │  └──────────────────────────────────┘ │
│  │ Reports  │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

---

## 4. TRADITIONAL WAY vs DYNAMIC WAY

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TRADITIONAL (Old SMS way) — Adding "Transport Allocation" module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Backend (Spring Boot):                 Frontend (Angular):
  ┌────────────────────────┐             ┌────────────────────────┐
  │ TransportAllocation    │             │ transport-alloc-list/   │
  │ Entity.java       ✍   │             │   .component.ts    ✍   │
  │ Repository.java   ✍   │             │   .component.html  ✍   │
  │ Service.java      ✍   │             │ transport-alloc-form/   │
  │ Controller.java   ✍   │             │   .component.ts    ✍   │
  │ DTO.java          ✍   │             │   .component.html  ✍   │
  │ Mapper.java       ✍   │             │ routing update     ✍   │
  └────────────────────────┘             └────────────────────────┘
  ~400 lines of Java                     ~300 lines of TypeScript/HTML

  Total: ~700 lines of code | 2-3 days of work | Needs redeployment


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DYNAMIC WAY — Adding "Transport Allocation" module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Admin opens DocType Builder in browser:
  ┌────────────────────────────────────────────┐
  │  DocType Name: transport_allocation        │
  │  Label:        Transport Allocation        │
  │  Module:        Transport                  │
  │  Location Scope: Yes                       │
  │                                            │
  │  Fields:                                   │
  │  + student    → Link to "student"          │
  │  + route      → Link to "transport_route"  │
  │  + stop       → Link to "route_stop"       │
  │  + start_date → Date                       │
  │  + end_date   → Date                       │
  │  + is_active  → Check                      │
  │                                            │
  │  [  SAVE  ]                                │
  └────────────────────────────────────────────┘

  That's it. 0 lines of code. Done in 5 minutes.
  ✓ List page works automatically at /d/transport_allocation
  ✓ Form page works automatically at /d/transport_allocation/new
  ✓ Search, filter, sort, pagination — all automatic
  ✓ Permissions — inherited from module config
  ✓ Location scoping — automatic
  ✓ Audit trail — automatic
```

---

## 5. DOCTYPE FIELD TYPES

```
┌──────────────────┬──────────────────────────────┬─────────────────────────┐
│   Field Type     │  Renders As                  │  Example                │
├──────────────────┼──────────────────────────────┼─────────────────────────┤
│  Text            │  <input type="text">          │  Student Name           │
│  Email           │  <input type="email">         │  parent@gmail.com       │
│  Phone           │  Country picker + number      │  +91 9876543210         │
│  Number          │  <input type="number">        │  Capacity: 40           │
│  Currency        │  Number with ₹ prefix         │  ₹12,500                │
│  Date            │  Date picker                  │  2025-06-01             │
│  Datetime        │  Date + time picker           │  2025-06-01 09:30       │
│  Check           │  Toggle / checkbox            │  Has Scholarship ☑      │
│  Select          │  Dropdown (fixed options)     │  Status: Active/Inactive│
│  Link            │  Searchable (links to DocType)│  Student: Arjun Kumar   │
│  Textarea        │  Multi-line text              │  Notes / Description    │
│  HTML            │  Rich text editor             │  Notice content         │
│  File            │  File upload widget           │  Admit card PDF         │
│  Image           │  Image upload + preview       │  Student photo          │
│  Password        │  Masked input                 │  ••••••••               │
│  URL             │  <input type="url">           │  Website link           │
│  Section Break   │  Visual divider + label       │  ── Personal Info ──    │
│  Column Break    │  2-column grid split          │  [left col] [right col] │
│  Child Table     │  Embedded table rows          │  Fee Items list         │
└──────────────────┴──────────────────────────────┴─────────────────────────┘

Link Field — connects DocTypes:
  ┌──────────────┐         ┌──────────────────┐
  │  Admission   │         │  Student         │
  │  ──────────  │ Link    │  ────────────    │
  │  student ───────────→  │  id, name, class │
  │  class_level │         └──────────────────┘
  └──────────────┘
```

---

## 6. GENERIC LIST PAGE FLOW

```
User clicks "Admission" in sidebar
         │
         ▼
Angular Router: /d/admission
         │
         ▼
┌─────────────────────────────────────┐
│  DynamicListComponent loads         │
│  doctype = "admission"              │
└──────────────┬──────────────────────┘
               │ GET /engine/meta/admission
               ▼
┌─────────────────────────────────────┐
│  Spring Boot returns DocType def:   │
│  {                                  │
│    name: "admission",               │
│    label: "Admission",              │
│    fields: [                        │
│      { key:"name", in_list:true },  │
│      { key:"student_name",          │
│        in_list:true },              │
│      { key:"status", type:"badge" },│
│      { key:"created_at" }           │
│    ]                                │
│  }                                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Angular builds columns from meta   │
│  columns = fields.filter(in_list)   │
└──────────────┬──────────────────────┘
               │ GET /engine/records/admission
               │ ?page=1&size=20&location_ids=1,2
               ▼
┌─────────────────────────────────────┐
│  Spring Boot queries                │
│  dynamic.admission table            │
│  with pagination + location scope   │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  USER SEES:                                                      │
│                                                                  │
│  Admission List                          [+ New Admission]       │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ Name         │ Student Name │ Class        │ Status       │  │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤  │
│  │ADM-2025-0001 │ Arjun Kumar  │ Class 5-A    │ ● Admitted   │  │
│  │ADM-2025-0002 │ Priya Singh  │ Class 4-B    │ ○ Applied    │  │
│  │ADM-2025-0003 │ Ravi Das     │ Class 5-A    │ ◌ Draft      │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│  Showing 3 of 3 records                       [< 1 >]           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. GENERIC FORM PAGE FLOW

```
User clicks "+ New Admission"
         │
         ▼
Angular Router: /d/admission/new
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  DynamicFormComponent loads                         │
│  1. GET /engine/meta/admission                      │
│  2. GET /engine/client-scripts/admission            │
│  3. Builds FormGroup from field definitions         │
│  4. Injects + executes client script (onload)       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  USER SEES FORM (built dynamically from meta):                   │
│                                                                  │
│  New Admission                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ── Personal Information ──────────────────────────────   │ │
│  │  Student Name *    [____________________________]          │ │
│  │  Date of Birth *   [____________________________]          │ │
│  │                                                            │ │
│  │  ── Academic Details ───────────────────────────────────  │ │
│  │  Class Applying *  [Select Class ▼]                        │ │
│  │  Academic Year *   [2025-26 ▼]                             │ │
│  │                                                            │ │
│  │  ── Parent Information ─────────────────────────────────  │ │
│  │  Parent Name *     [____________________________]          │ │
│  │  Contact Phone *   [+91 __________]                        │ │
│  │                                                            │ │
│  │  ── Scholarship ────────────────────────────────────────  │ │
│  │  Has Scholarship   [ ] (if checked → shows next field)     │ │
│  │  [hidden] Scholarship Amount  [₹_____________]             │ │
│  │                                                            │ │
│  │  Notes             [________________________________]       │ │
│  │                    [________________________________]       │ │
│  │                                                            │ │
│  │            [Cancel]              [Save]                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
         │
         │ User fills form, clicks Save
         ▼
┌─────────────────────────────────────┐
│  POST /engine/records/admission     │
│  { student_name, dob, class, ... }  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐   ← runs BEFORE saving
│  Server Script: "before_insert"     │
│  validate age >= 3                  │
│  check duplicate (same student)     │
│  set status = "Draft"               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Naming Series: ADM-.YYYY.-.####    │
│  counter: 3 → ADM-2025-0003        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  INSERT INTO dynamic.admission ...  │
│  name = "ADM-2025-0003"             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐   ← runs AFTER saving
│  Server Script: "after_insert"      │
│  send notification to admin         │
│  log activity                       │
└──────────────┬──────────────────────┘
               │
               ▼
         ✓ Record saved
         Form shows: ADM-2025-0003
```

---

## 8. SERVER SCRIPT FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER SCRIPT LIFECYCLE                      │
└─────────────────────────────────────────────────────────────────┘

  Admin configures this once in Script Editor:
  ┌──────────────────────────────────────────────────┐
  │  DocType:  admission                             │
  │  Event:    after_insert                          │
  │  Script:                                         │
  │                                                  │
  │  // Auto-create student profile on admission     │
  │  if (doc.status === 'Admitted') {                │
  │    frappe.db.insert('student', {                 │
  │      full_name: doc.student_name,                │
  │      date_of_birth: doc.date_of_birth,           │
  │      admission_id: doc.name,                     │
  │      class_level: doc.class_applying             │
  │    });                                           │
  │  }                                               │
  └──────────────────────────────────────────────────┘

  Runtime flow:
  [Save Button] → POST /engine/records/admission
       │
       ├─→ run "validate" script      (check rules)
       │
       ├─→ run "before_insert" script (set defaults, block if needed)
       │
       ├─→ INSERT into DB
       │
       └─→ run "after_insert" script  (side effects: notifications, auto-create)

  Available events:
  ┌─────────────────┬────────────────────────────────────────┐
  │  validate       │ Runs before save, throw to block       │
  │  before_insert  │ Before new record created              │
  │  after_insert   │ After new record created               │
  │  before_update  │ Before existing record updated         │
  │  after_update   │  After existing record updated         │
  │  before_delete  │ Before record deleted (can block)      │
  │  after_delete   │ After record deleted                   │
  │  on_submit      │ When workflow moves to submitted state │
  │  on_cancel      │ When workflow cancelled                │
  └─────────────────┴────────────────────────────────────────┘

  Script context (what scripts can use):
  ┌────────────────────────────────────────────────────────┐
  │  doc                    — current record (read/write)  │
  │  frappe.db.get_doc()    — fetch another record         │
  │  frappe.db.get_list()   — fetch multiple records       │
  │  frappe.db.insert()     — create a record              │
  │  frappe.db.set_value()  — update a field               │
  │  frappe.throw('msg')    — block save with error        │
  │  frappe.sendmail()      — send email                   │
  │  frappe.log()           — write to activity log        │
  └────────────────────────────────────────────────────────┘
```

---

## 9. CLIENT SCRIPT FLOW

```
  Admin configures this once:
  ┌──────────────────────────────────────────────────┐
  │  DocType:  fee_collection                        │
  │  Event:    on_change → field: student            │
  │  Script:                                         │
  │                                                  │
  │  frappe.ui.form.on('fee_collection', {           │
  │    student: function(frm) {                      │
  │      // When student selected, auto-fill class   │
  │      frappe.db.get_doc('student',                │
  │        frm.doc.student).then(s => {             │
  │          frm.set_value('class_level', s.class);  │
  │          frm.set_value('route', s.transport_route│
  │        });                                       │
  │    }                                             │
  │  });                                             │
  └──────────────────────────────────────────────────┘

  Runtime flow:
  Form loads → GET /engine/client-scripts/fee_collection
       │
       ▼
  Angular injects script into form context
       │
       ▼
  User selects "Arjun Kumar" in Student field
       │
       ▼
  Script fires → fetches Arjun's record from DB
       │
       ▼
  Auto-fills:  Class Level = "Class 5-A"
               Transport Route = "Route 3 - North"
       │
       ▼
  User sees fields filled — without touching them

  Available client events:
  ┌──────────────────┬────────────────────────────────────┐
  │  onload          │ When form first opens              │
  │  refresh         │ After save, on reload              │
  │  before_save     │ Just before POST/PUT sent          │
  │  after_save      │ After server responds success      │
  │  on_submit       │ After workflow submit action       │
  │  on_cancel       │ After workflow cancel action       │
  │  on_change       │ When a specific field value changes│
  └──────────────────┴────────────────────────────────────┘
```

---

## 10. NAMING SERIES

```
  Admin configures:
  ┌──────────────────────────────────┐
  │  DocType:   admission            │
  │  Series:    ADM-.YYYY.-.####     │
  └──────────────────────────────────┘

  Tokens explained:
  ┌─────────┬──────────────────────────────┐
  │  .YYYY. │ 4-digit year  → 2025         │
  │  .MM.   │ 2-digit month → 05           │
  │  .LOC.  │ Location code → MAIN         │
  │  .####  │ Counter (4 digits, resets)   │
  │  .##### │ Counter (5 digits)           │
  └─────────┴──────────────────────────────┘

  How counter works:
  ┌──────────────────────────────────────────────────────────┐
  │  engine.naming_series_counters                           │
  │  ┌────────────────┬─────────┬────────────┬──────────┐   │
  │  │ series         │ prefix  │ year_month │ current  │   │
  │  ├────────────────┼─────────┼────────────┼──────────┤   │
  │  │ ADM-.YYYY.-.## │ ADM-    │ 2025-05    │   3      │   │
  │  │ STU-.YYYY.-.## │ STU-    │ 2025-05    │  47      │   │
  │  │ FEE-.YYYY.-.## │ FEE-    │ 2025-05    │ 112      │   │
  │  └────────────────┴─────────┴────────────┴──────────┘   │
  └──────────────────────────────────────────────────────────┘

  ADM-.YYYY.-.#### → ADM-2025-0003
  STU-.YYYY.-.#### → STU-2025-0047
  FEE-.YYYY.-.#### → FEE-2025-0112
```

---

## 11. WORKFLOW ENGINE

```
  Admission Workflow:

  ┌─────────┐  Submit    ┌──────────┐  Review OK  ┌──────────┐
  │  DRAFT  │ ─────────→ │ APPLIED  │ ───────────→ │ REVIEWED │
  └─────────┘            └──────────┘              └────┬─────┘
       ↑                      │                         │
       │ Cancel               │ Reject                  │ Admit
       │                      ▼                         ▼
       │                 ┌──────────┐              ┌──────────┐
       └──────────────── │ REJECTED │              │ ADMITTED │
                         └──────────┘              └──────────┘

  Configured in DB (not code):
  ┌────────────────────────────────────────────────────────────────┐
  │  engine.workflow_states                                        │
  │  Draft, Applied, Reviewed, Admitted, Rejected                  │
  │                                                                │
  │  engine.workflow_actions                                       │
  │  ┌────────────┬────────────┬────────────┬───────────────────┐ │
  │  │ From State │ Action     │ To State   │ Allowed Role      │ │
  │  ├────────────┼────────────┼────────────┼───────────────────┤ │
  │  │ Draft      │ Submit     │ Applied    │ Admission Staff   │ │
  │  │ Applied    │ Review     │ Reviewed   │ Admission Manager │ │
  │  │ Reviewed   │ Admit      │ Admitted   │ Principal         │ │
  │  │ Reviewed   │ Reject     │ Rejected   │ Principal         │ │
  │  │ Applied    │ Reject     │ Rejected   │ Admission Manager │ │
  │  └────────────┴────────────┴────────────┴───────────────────┘ │
  └────────────────────────────────────────────────────────────────┘

  On Form — user sees action buttons based on current state + role:
  ┌────────────────────────────────────────────────────────────────┐
  │  Admission: ADM-2025-0003          Status: ● Reviewed          │
  │  Student: Ravi Das                                             │
  │  Class: Class 5-A                                              │
  │  ...                                                           │
  │                                                                │
  │  Workflow Actions (visible only to Principal):                 │
  │  [  Admit  ]    [  Reject  ]                                   │
  └────────────────────────────────────────────────────────────────┘
```

---

## 12. CHILD TABLE

```
  DocType: fee_schedule
  ┌───────────────────────────────────────────────────────────┐
  │  Fee Schedule                    [Save]  [Print]          │
  │                                                           │
  │  Class Level *    [Class 5 ▼]                             │
  │  Academic Year *  [2025-26 ▼]                             │
  │  Due Date *       [2025-06-01]                            │
  │                                                           │
  │  ── Fee Items (Child Table) ────────────────────────────  │
  │  ┌──────────────────┬──────────┬──────────┬────────────┐  │
  │  │ Fee Category     │ Amount   │ Discount │ Net Amount │  │
  │  ├──────────────────┼──────────┼──────────┼────────────┤  │
  │  │ Tuition Fee      │ ₹10,000  │ ₹0       │ ₹10,000   │  │
  │  │ Transport Fee    │ ₹2,500   │ ₹500     │ ₹2,000    │  │
  │  │ Activity Fee     │ ₹500     │ ₹0       │ ₹500      │  │
  │  ├──────────────────┼──────────┼──────────┼────────────┤  │
  │  │                  │ Total    │          │ ₹12,500   │  │
  │  └──────────────────┴──────────┴──────────┴────────────┘  │
  │  [+ Add Row]                                              │
  └───────────────────────────────────────────────────────────┘

  How it works in DB:
  ┌─────────────────────────────┐    ┌────────────────────────────────────┐
  │ dynamic.fee_schedule        │    │ dynamic.fee_schedule_item          │
  │ ──────────────────────────  │    │ (child table - auto created)       │
  │ id: 1                       │    │ ────────────────────────────────   │
  │ name: FS-2025-001           │    │ parent_id: 1                       │
  │ class_level: Class 5        │    │ fee_category: Tuition Fee          │
  │ academic_year: 2025-26      │───→│ amount: 10000                      │
  │ due_date: 2025-06-01        │    │ ──────────────                     │
  └─────────────────────────────┘    │ parent_id: 1                       │
                                     │ fee_category: Transport Fee        │
                                     │ amount: 2500                       │
                                     └────────────────────────────────────┘
```

---

## 13. FETCH FROM (Auto-fill)

```
  Field config in DocType Builder:
  ┌──────────────────────────────────────────────────┐
  │  Field: student_name                             │
  │  Type:  Text                                     │
  │  fetch_from: student.full_name                   │
  │  read_only: true                                 │
  └──────────────────────────────────────────────────┘

  What happens at runtime:

  ┌──────────────────────────────────────────────────────┐
  │  Fee Collection Form                                 │
  │                                                      │
  │  Student *    [Arjun Kumar (STU-2025-001) ▼]  ← user picks this │
  │                        │                            │
  │                        │ auto-fetch triggers        │
  │                        ▼                            │
  │  Student Name [Arjun Kumar         ] ← auto-filled  │
  │  Class Level  [Class 5-A           ] ← auto-filled  │
  │  DOB          [2015-06-15          ] ← auto-filled  │
  │  Route        [Route 3 - North     ] ← auto-filled  │
  │                                                      │
  │  Amount *     [₹12,500            ]  ← user fills   │
  └──────────────────────────────────────────────────────┘

  fetch_from: "student.full_name"
              ─────┬──── ────┬────
                   │         └── field in Student DocType
                   └── Link field name on this form
```

---

## 14. DEPENDS ON (Conditional Fields)

```
  Field config:
  ┌──────────────────────────────────────────────────┐
  │  Field: scholarship_amount                       │
  │  Type:  Currency                                 │
  │  depends_on: doc.has_scholarship == 1            │
  └──────────────────────────────────────────────────┘

  What user sees:

  WHEN has_scholarship = unchecked:           WHEN has_scholarship = checked:
  ┌──────────────────────────────┐            ┌──────────────────────────────┐
  │  Has Scholarship  [ ]        │            │  Has Scholarship  [✓]        │
  │                              │            │                              │
  │  (scholarship_amount hidden) │            │  Scholarship Amount          │
  │                              │            │  [₹__________________]       │
  └──────────────────────────────┘            └──────────────────────────────┘

  More examples:
  ┌─────────────────────────────────────────────────────────────┐
  │  depends_on: doc.transport_required == 1                    │
  │  → shows Route, Stop, Vehicle fields only if transport tick │
  │                                                             │
  │  depends_on: doc.employment_type == "Contract"              │
  │  → shows Contract End Date only for contract employees      │
  │                                                             │
  │  depends_on: doc.status == "Admitted"                       │
  │  → shows Admission Date only after admission confirmed      │
  └─────────────────────────────────────────────────────────────┘
```

---

## 15. DOCTYPE BUILDER UI

```
  URL: /engine/doctype-builder

┌─────────────────────────────────────────────────────────────────────────────┐
│  DocType Builder                                              [Save DocType] │
├──────────────────┬──────────────────────────────────┬───────────────────────┤
│  FIELD PALETTE   │         FORM PREVIEW             │   FIELD PROPERTIES    │
│                  │                                  │                       │
│  ┌────────────┐  │  DocType Name: [admission     ]  │  Selected: student_name│
│  │ Text       │  │  Module:       [Admission ▼   ]  │                       │
│  │ Email      │  │  Location Scope: [✓]             │  Label: [Student Name]│
│  │ Phone      │  │                                  │  Type:  [Text ▼]      │
│  │ Number     │  │  ── Personal Info ────────────── │  Required: [✓]        │
│  │ Currency   │  │  ┌────────────┐  ┌────────────┐  │  Unique:   [ ]        │
│  │ Date       │  │  │student_name│  │date_of_brth│  │  In List:  [✓]        │
│  │ Select     │  │  └────────────┘  └────────────┘  │  In Filter:[✓]        │
│  │ Link       │  │                                  │  Read Only:[ ]        │
│  │ Child Table│  │  ── Academic ─────────────────── │                       │
│  │ Textarea   │  │  ┌────────────────────────────┐  │  Max Length:[100    ] │
│  │ Check      │  │  │  class_applying            │  │  Min Length:[2      ] │
│  │ File       │  │  └────────────────────────────┘  │                       │
│  │ HTML       │  │                                  │  Options:             │
│  │ Section Brk│  │  [+ Add Section]                 │  (for Select type)    │
│  │ Column Brk │  │                                  │  [ ______________ ]   │
│  └────────────┘  │                                  │  [+ Add Option]       │
│                  │                                  │                       │
│  drag → drop     │  drag rows to reorder ↕          │  fetch_from:          │
│  onto preview    │                                  │  [ ________________ ] │
└──────────────────┴──────────────────────────────────┴───────────────────────┘
```

---

## 16. CUSTOMIZE FORM UI

```
  URL: /engine/customize/admission
  (Admin can hide/show/reorder without touching code)

┌─────────────────────────────────────────────────────────────────────────────┐
│  Customize Form: Admission                             [Reset] [Save]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ☰  student_name        Label:[Student Name      ] Mandatory[✓] List[✓]   │
│  ☰  date_of_birth       Label:[Date of Birth     ] Mandatory[✓] List[ ]   │
│  ☰  class_applying      Label:[Class Applying    ] Mandatory[✓] List[✓]   │
│  ☰  parent_name         Label:[Parent Name       ] Mandatory[✓] List[ ]   │
│  ☰  contact_phone       Label:[Contact Phone     ] Mandatory[✓] List[ ]   │
│  ☰  notes               Label:[Notes             ] Mandatory[ ] List[ ]   │
│  ☰  sibling_discount ←──── CUSTOM FIELD (added by admin)                  │
│                                                                             │
│  [+ Add Custom Field]                                                       │
│                                                                             │
│  ☰ = drag to reorder        Hidden fields show with strikethrough          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. PRINT FORMAT

```
  Admin creates template once:
  ┌──────────────────────────────────────────────────┐
  │  Print Format: "Admission Letter"                │
  │  DocType: admission                              │
  │  Template (Handlebars HTML):                     │
  │                                                  │
  │  <h2>{{school_name}}</h2>                        │
  │  <p>Dear {{parent_name}},</p>                    │
  │  <p>We are pleased to admit {{student_name}}     │
  │  to {{class_applying}} for academic year         │
  │  {{academic_year}}.</p>                          │
  │  <p>Admission No: <b>{{name}}</b></p>            │
  │  <p>Date: {{admission_date}}</p>                 │
  └──────────────────────────────────────────────────┘

  Runtime:
  User clicks [Print] on admission form
       │
       ▼
  GET /engine/print/admission/ADM-2025-0003?format=Admission Letter
       │
       ▼
  Spring Boot fetches record + fills Handlebars template
       │
       ▼
  PDF generated (iText / Puppeteer)
       │
       ▼
  Browser downloads "ADM-2025-0003-Admission-Letter.pdf"
```

---

## 18. REPORT BUILDER

```
  Two report types:

  TYPE 1 — Query Report:
  ┌──────────────────────────────────────────────────────────────────┐
  │  Report: "Class Strength Summary"                                │
  │  SQL:                                                            │
  │  SELECT cl.name as class, COUNT(s.id) as strength,              │
  │         COUNT(CASE WHEN s.gender='M' THEN 1 END) as boys,       │
  │         COUNT(CASE WHEN s.gender='F' THEN 1 END) as girls       │
  │  FROM dynamic.student s                                          │
  │  JOIN dynamic.class_level cl ON s.class_level = cl.name         │
  │  WHERE s.is_active = true                                        │
  │  GROUP BY cl.name ORDER BY cl.name                              │
  │                                                                  │
  │  Filters: [Academic Year ▼]  [Location ▼]   [Run Report]        │
  └──────────────────────────────────────────────────────────────────┘

  USER SEES:
  ┌───────────────┬──────────┬──────┬───────┐
  │ Class         │ Strength │ Boys │ Girls │
  ├───────────────┼──────────┼──────┼───────┤
  │ Class 1-A     │ 38       │ 20   │ 18    │
  │ Class 1-B     │ 40       │ 22   │ 18    │
  │ Class 5-A     │ 35       │ 18   │ 17    │
  └───────────────┴──────────┴──────┴───────┘
  [Export Excel]  [Export PDF]

  TYPE 2 — Script Report:
  ┌──────────────────────────────────────────────────────────────────┐
  │  return frappe.get_list('student_attendance', {                  │
  │    filters: { date: ['between', from_date, to_date] },           │
  │    fields: ['student', 'date', 'status'],                        │
  │    group_by: 'student'                                           │
  │  });                                                             │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 19. ALL SMS MODULES AS DOCTYPES

```
SHAANTHI ERP — ALL MODULES (Zero Static Code)

┌─────────────────────────────────────────────────────────────────────────┐
│                         engine.doctypes                                 │
├─────────────────┬───────────────────────────────────────────────────────┤
│  MODULE         │  DOCTYPES                                             │
├─────────────────┼───────────────────────────────────────────────────────┤
│  ADMISSION      │  enquiry, registration, admission                     │
├─────────────────┼───────────────────────────────────────────────────────┤
│  STUDENT        │  student, parent, student_document,                   │
│                 │  student_group, student_group_mapping, promotion       │
├─────────────────┼───────────────────────────────────────────────────────┤
│  ACADEMIC       │  subject_general, subject, class_general,             │
│                 │  class_level, curriculum, syllabus, lesson,           │
│                 │  lesson_topic, class_subject_mapping (child)          │
├─────────────────┼───────────────────────────────────────────────────────┤
│  ATTENDANCE     │  student_attendance (+ child: detail),                │
│                 │  employee_attendance, biometric_device,               │
│                 │  attendance_activity                                  │
├─────────────────┼───────────────────────────────────────────────────────┤
│  ASSESSMENT     │  assessment, mark_entry (+ child: detail),            │
│                 │  question, question_paper, digital_test               │
├─────────────────┼───────────────────────────────────────────────────────┤
│  TIMETABLE      │  timetable_config, timetable (+ child: period),       │
│                 │  exam_timetable, timetable_substitution               │
├─────────────────┼───────────────────────────────────────────────────────┤
│  FINANCE        │  fee_category, fee_schedule (+ child: items),         │
│                 │  fee_collection, ledger, voucher (+ child: detail)    │
├─────────────────┼───────────────────────────────────────────────────────┤
│  HR / PAYROLL   │  employee, salary_template (+ child: detail),         │
│                 │  salary_slip (+ child: detail), leave_request,        │
│                 │  pay_head, attendance_process                         │
├─────────────────┼───────────────────────────────────────────────────────┤
│  TRANSPORT      │  transport_route (+ child: stop),                     │
│                 │  vehicle, transport_allocation,                       │
│                 │  transport_attendance                                 │
├─────────────────┼───────────────────────────────────────────────────────┤
│  COMMUNICATION  │  memo, notice_board, event, online_meeting            │
├─────────────────┼───────────────────────────────────────────────────────┤
│  MASTERS        │  academic_year, exam_type, exam_term, caste, house,   │
│  (50+ tables)   │  holiday, holiday_category, award, award_type,        │
│                 │  document_type, resource_type, health_parameter_type,  │
│                 │  memo_category, memo_subject, book_category,           │
│                 │  employee_category, employee_group, pay_head_type,     │
│                 │  bank_account, bank_branch, designation, ...          │
└─────────────────┴───────────────────────────────────────────────────────┘

Each DocType above = 1 row in engine.doctypes + n rows in engine.doctype_fields
ZERO Spring Boot controllers. ZERO Angular components.
```

---

## 20. SIDEBAR & NAVIGATION

```
  How sidebar is built — from DB, not code:

  ┌───────────────────────────────────┐     engine.menus:
  │  📚 ShaanthiEd                    │     ┌─────────────┬─────────────────┐
  │                                   │     │ menu        │ route_path      │
  │  ▼ ADMISSION                      │     ├─────────────┼─────────────────┤
  │    ├─ Enquiry          /d/enquiry  │     │ Enquiry     │ /d/enquiry      │
  │    ├─ Registration     /d/reg...   │     │ Admission   │ /d/admission    │
  │    └─ Admission        /d/admis... │     │ Student     │ /d/student      │
  │                                   │     │ ...         │ ...             │
  │  ▼ STUDENT                        │     └─────────────┴─────────────────┘
  │    ├─ Student Profile  /d/student  │
  │    ├─ Student Groups   /d/stude... │     All routes = /d/:doctype
  │    └─ Promotions       /d/promo... │     One Angular route handles ALL
  │                                   │
  │  ▼ ACADEMIC                       │
  │    ├─ Subjects         /d/subject  │
  │    ├─ Classes          /d/class... │
  │    └─ Curriculum       /d/curric.. │
  │                                   │
  │  ▼ ATTENDANCE                     │
  │  ▼ ASSESSMENT                     │
  │  ▼ FINANCE                        │
  │  ▼ HR & PAYROLL                   │
  │  ▼ TRANSPORT                      │
  │  ▼ REPORTS                        │
  │  ▼ SETTINGS                       │
  └───────────────────────────────────┘

  Angular routing (just TWO routes for everything):
  { path: 'd/:doctype',     component: DynamicListComponent  }
  { path: 'd/:doctype/:id', component: DynamicFormComponent  }
```

---

## 21. PERMISSION SYSTEM

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    Permission Hierarchy                         │
  └─────────────────────────────────────────────────────────────────┘

  Group (Role)
     │
     └── has permissions on Modules (DocTypes)
              │
              └── each permission has actions:
                  VIEW │ CREATE │ EDIT │ DELETE │ IMPORT │ EXPORT

  Example:
  ┌──────────────────────┬─────┬────────┬──────┬────────┬────────┬────────┐
  │  Group / DocType     │VIEW │ CREATE │ EDIT │ DELETE │ IMPORT │ EXPORT │
  ├──────────────────────┼─────┼────────┼──────┼────────┼────────┼────────┤
  │  Admin / admission   │  ✓  │   ✓    │  ✓   │   ✓    │   ✓    │   ✓    │
  │  Staff / admission   │  ✓  │   ✓    │  ✓   │   ✗    │   ✗    │   ✓    │
  │  Teacher / admission │  ✓  │   ✗    │  ✗   │   ✗    │   ✗    │   ✗    │
  │  Admin / salary_slip │  ✓  │   ✓    │  ✓   │   ✓    │   ✓    │   ✓    │
  │  Teacher / salary_sl │  ✓  │   ✗    │  ✗   │   ✗    │   ✗    │   ✗    │
  └──────────────────────┴─────┴────────┴──────┴────────┴────────┴────────┘

  On form:           On list:
  [Save] hidden      [Delete] hidden
  if no CREATE       if no DELETE
  permission         permission

  Gated at 3 levels:
  1. API level (Spring Boot checks JWT group permissions)
  2. UI level (Angular hides buttons based on permissions)
  3. Row level (user only sees their location's records)
```

---

## 22. LOCATION SCOPING

```
  Multi-branch school setup:

  ┌──────────────┐
  │ ORGANIZATION │  ShaanthiEd
  └──────┬───────┘
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
┌─────────┐               ┌─────────┐
│ Branch  │               │ Branch  │
│ MAIN    │               │ NORTH   │
│ Campus  │               │ Campus  │
└────┬────┘               └────┬────┘
     │                         │
     ▼                         ▼
  Students,                Students,
  Staff, Fees              Staff, Fees
  for MAIN only            for NORTH only

  ┌────────────────────────────────────────────────────────────┐
  │  User: Mrs. Lakshmi (Admission Staff, MAIN Campus)         │
  │                                                            │
  │  She sees:  Only MAIN Campus admissions                    │
  │  She CAN'T: See NORTH Campus student data                  │
  │  Header:    [MAIN Campus ▼]   (location selector)          │
  └────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │  User: Mr. Rajan (Principal, ALL branches)                 │
  │                                                            │
  │  He sees:   [MAIN Campus ✓] [NORTH Campus ✓]              │
  │  Header:    Multi-select location toggle                   │
  │  Report:    Can compare both branches                      │
  └────────────────────────────────────────────────────────────┘

  Every DocType with location_scope: true
  → API automatically filters by user's selected location_ids
  → No extra code needed
```

---

## 23. IMPLEMENTATION TIMELINE

```
Week  1-2   ┤██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Engine DB schema + DocType CRUD API (Spring Boot)            │

Week  3-4   ┤░░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Dynamic schema manager (CREATE TABLE per DocType)            │

Week  5-6   ┤░░░░░░░░░░░░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Generic List + Form rendering (Angular DynamicComponents)    │

Week  7     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  DocType Builder UI (drag-drop)                               │

Week  8     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░░░░░░░░│
            │  Naming Series + Server Script executor (GraalVM)             │

Week  9     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░░░│
            │  Client Script injection in Angular forms                     │

Week 10     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░│
            │  Seed all Master Data DocTypes (50+ masters, zero code)       │

Week 11     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░░░░░░│
            │  Seed Admission + Student + Parent DocTypes                   │

Week 12     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████░│
            │  Seed Academic + Attendance DocTypes                          │

Week 13     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Seed Assessment + Timetable DocTypes                   ████  │

Week 14     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Seed Finance + HR + Payroll DocTypes                    ████ │

Week 15     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Workflow engine UI + transitions                         ████ │

Week 16     ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
            │  Print formats + Report builder                            ████│
```

---

## 24. TRADITIONAL vs DYNAMIC — SIDE BY SIDE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│             ADDING A NEW MODULE: "Scholarship Management"                   │
├────────────────────────────────────┬────────────────────────────────────────┤
│      TRADITIONAL (Old Way)         │         DYNAMIC (New Way)              │
├────────────────────────────────────┼────────────────────────────────────────┤
│                                    │                                        │
│  BACKEND (Spring Boot):            │  Open DocType Builder in browser:      │
│  ✍ Scholarship.java (Entity)       │                                        │
│  ✍ ScholarshipRepo.java            │  1. Type name: "scholarship"           │
│  ✍ ScholarshipService.java         │  2. Drag fields: student (Link),       │
│  ✍ ScholarshipController.java      │     scholarship_type (Select),         │
│  ✍ ScholarshipDTO.java             │     amount (Currency),                 │
│  ✍ ScholarshipMapper.java          │     valid_from (Date),                 │
│  ✍ Migration SQL file              │     approved_by (Link→User),           │
│                                    │     notes (Textarea)                   │
│  FRONTEND (Angular):               │  3. Click Save                         │
│  ✍ scholarship-list.component.ts   │                                        │
│  ✍ scholarship-list.component.html │  Done. ✓                               │
│  ✍ scholarship-form.component.ts   │                                        │
│  ✍ scholarship-form.component.html │  List page: /d/scholarship ✓          │
│  ✍ scholarship.routes.ts           │  Form page: /d/scholarship/new ✓      │
│  ✍ endpoints.ts (add entry)        │  Search, filter, sort ✓               │
│  ✍ sidebar menu update             │  Permissions ✓                        │
│                                    │  Location scope ✓                     │
│  ~700 lines of code                │  Audit trail ✓                        │
│  2-3 days                          │                                        │
│  Requires redeployment             │  0 lines of code                      │
│  Git commit + PR review            │  5 minutes                            │
│  DevOps pipeline                   │  No deployment needed                 │
│                                    │  No git commit                        │
├────────────────────────────────────┼────────────────────────────────────────┤
│  Want to add a field later?        │  Want to add a field later?            │
│  → Edit 5 files, redeploy          │  → Open Customize Form, add field, save│
├────────────────────────────────────┼────────────────────────────────────────┤
│  Want an auto-approval workflow?   │  Want an auto-approval workflow?       │
│  → New Java service methods        │  → Configure Workflow in UI            │
│  → New Angular state handling      │  → Done in 10 minutes                 │
│  → 1 more day of work              │                                        │
├────────────────────────────────────┼────────────────────────────────────────┤
│  Want to auto-notify on approval?  │  Want to auto-notify on approval?      │
│  → New Spring @EventListener       │  → Write Server Script "on_submit"     │
│  → Recompile + redeploy            │  → Save in browser. Done.             │
└────────────────────────────────────┴────────────────────────────────────────┘

BOTTOM LINE:
┌────────────────────┬──────────────┬──────────────┐
│                    │ Traditional  │  Dynamic     │
├────────────────────┼──────────────┼──────────────┤
│ New simple module  │ 2-3 days     │ 5 minutes    │
│ Add a field        │ 30 minutes   │ 30 seconds   │
│ Add a workflow     │ 1 day        │ 10 minutes   │
│ Add business rule  │ 2 hours      │ 5 minutes    │
│ New print format   │ Half day     │ 15 minutes   │
│ New report         │ 1 day        │ 10 minutes   │
│ Lines of code      │ 700+         │ 0            │
│ Needs redeployment │ YES          │ NO           │
└────────────────────┴──────────────┴──────────────┘
```

---

## QUICK REFERENCE SUMMARY

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    HOW EVERYTHING CONNECTS                           │
  │                                                                      │
  │  Admin:  DocType Builder → define fields → SchemaManager creates DB  │
  │  Admin:  Server Script   → attach to events → auto business rules    │
  │  Admin:  Client Script   → attach to form   → smart UX behaviour     │
  │  Admin:  Naming Series   → define pattern   → auto numbering         │
  │  Admin:  Workflow        → define states    → approval buttons       │
  │  Admin:  Print Format    → HTML template    → PDF on demand          │
  │  Admin:  Report          → SQL query        → data table + export    │
  │                                                                      │
  │  User:   Login → see menus from DB → open list → open form          │
  │          → fill fields (auto-filled via fetch_from)                  │
  │          → conditional fields (depends_on)                           │
  │          → save → server scripts run → naming series assigns ID      │
  │          → workflow buttons appear → approval flow                   │
  │          → print → PDF generated from template                       │
  │                                                                      │
  │  Result: 130 modules. 0 static components. 0 redeployments.         │
  └──────────────────────────────────────────────────────────────────────┘
```
