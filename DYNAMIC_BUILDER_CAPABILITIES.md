# Dynamic Builder — Capabilities & Limitations

> **Purpose:** Clear statement of what the dynamic form/list builder can and cannot do.  
> **Audience:** Technical lead, project manager, stakeholders.

---

## What It Can Do ✓

---

### 1. Simple Data Fields — Fully Automatic

Configure once in the Doctype UI → list page + form page work with zero code written.

**Supported field types:**

| Type | Example |
|---|---|
| `text` | Name, Username, Code |
| `email` | Email address |
| `number` | Age, Capacity, Order |
| `phone` | Mobile with country code |
| `url` | Website, Social links |
| `textarea` | Notes, Description |
| `password` | Login password (hashed) |
| `checkbox` | Active / Inactive |
| `select` | Gender, Status (static options) |
| `async-select` | Linked record dropdown |
| `file` | Photo, Logo, Document |
| `address` | Multiple addresses with types |

---

### 2. Linked Records (One-to-One)

```
Example: "Class" linked to one "Location"

→ Configure field_type: async-select, ref_doctype_slug: locations
→ Dropdown with search works automatically
→ Location name appears in list automatically
→ Zero code written
```

---

### 3. File / Image Uploads

```
Example: Student photo, Organization logo

→ Configure displayStyle: avatar / photo / dropzone
→ Upload, preview, replace all work automatically
→ Avatar shows in list view automatically
→ Zero code written
```

---

### 4. Address Management

```
Example: Organization has multiple addresses (Primary, Branch, Other)

→ Configure field_type: address, select allowed address types
→ Full add / edit / remove UI works automatically
→ Zero code written
```

---

### 5. Location Scoping

```
Example: Show only records belonging to the user's assigned branch

→ Toggle is_location_scoped = true on the doctype
→ Header location filter automatically scopes all list data
→ Zero code written
```

---

### 6. Standard List Features

All list pages get these automatically — no configuration needed:

- Pagination
- Global search
- Per-column filtering
- Sort by any column
- Bulk delete
- Import / Export
- Permission-gated actions (Create, Edit, Delete, View, Import, Export)
- Audit columns (Created by, Updated by, Created at)

---

## What It Cannot Do ✗

---

### 1. One Form Saving to Multiple Tables

**Example: User form**

```
User fills:
  Name, Username, Password, Group        → saves to users table      ✓
  + selects 3 Locations with 1 default   → saves to user_locations   ✗
                                           table (separate table,
                                           separate save logic)

The dynamic engine saves ONE record to ONE table.
It has no concept of splitting a save across multiple tables.
```

**Modules affected:** Users (location access), any module with junction/mapping tables.

---

### 2. Relational Matrix / Grid Interfaces

**Example: Group Permissions form**

```
ACADEMIC menu                        [✓ All]
  Classes module   View ✓  Create ✓  Edit ✓  Delete ☐
  Subjects module  View ✓  Create ☐  Edit ☐  Delete ☐

SETTINGS menu                        [☐ All]
  Users module     View ✓  Create ☐  Edit ☐  Delete ☐
```

**Why it cannot work:**
- This is a 3-level nested data structure (Menu → Module → Permission)
- Data comes from 3 separate API calls before rendering
- Saving writes dozens of rows to a permissions table
- "Toggle All" logic, column-wise toggle, row-wise toggle have no equivalent field type concept
- The dynamic engine has no model for hierarchical matrix data

**Modules affected:** Group permissions, Menu-module assignments, Role matrices.

---

### 3. Conditional Fields (Show/Hide Based on Another Field's Value)

**Example: User form — Person Type**

```
User Type = "Staff"     → show only Name, Email
User Type = "Employee"  → show Name, Email + Employee picker
                          selecting employee auto-fills Name,
                          Email, Phone from employee record
                          (requires a live API call mid-form)
User Type = "Student"   → show Name, Email + Student picker
```

**Why it cannot work:**
- Field visibility depends on runtime value of another field
- Auto-fill requires a separate API call triggered by a selection
- The dynamic engine renders all fields from config at load time
- It has no conditional visibility or reactive dependency model

**Modules affected:** Users (person type), any form where fields depend on a mode or type selection.

---

### 4. Computed / Derived / Formula Fields

**Example: Fee calculation**

```
Base Fee:      ₹10,000
Discount 10%:  ₹ 1,000   ← derived from Base Fee × Discount %
─────────────────────────
Total:         ₹ 9,000   ← auto-calculated, updates as user types
                            not a stored field — a formula result
```

**Why it cannot work:**
- The dynamic engine stores only what the user types
- It has no formula, expression, or compute concept
- Live recalculation as user types requires component-level logic

**Modules affected:** Fee structures, salary calculations, invoice totals, any financial module.

---

### 5. Parent → Child Record Tables (Sub-rows / Line Items)

**Example: Fee Structure form**

```
Fee Structure: "Term 1 — 2025"

  Fee Items
  ──────────────────────────────────
  Tuition Fee    ₹8,000    [Remove]
  Lab Fee        ₹  500    [Remove]
  Sports Fee     ₹  300    [Remove]
  [ + Add Item ]
  ──────────────────────────────────
  Total: ₹8,800
```

**Why it cannot work:**
- Each fee item is a separate DB record in a child table
- The form manages a dynamic list of child records inline
- The dynamic engine has one form = one record, always
- It cannot manage an inline list of related child records

**Modules affected:** Fee structures (fee items), exam schedules (subject slots), timetables (period slots), purchase orders (line items).

---

### 6. Multi-Step / Wizard Forms

**Example: Student Admission form**

```
Step 1 → Student Personal Information
Step 2 → Parent / Guardian Information
Step 3 → Previous School Details
Step 4 → Document Upload
Step 5 → Fee Payment

Each step may:
  - Save to a different table
  - Validate independently before proceeding
  - Allow going back and editing
  - Show a progress indicator
```

**Why it cannot work:**
- The dynamic engine is single-page, single-submit only
- It has no concept of steps, navigation between steps, or per-step validation
- Saving across multiple tables across multiple steps requires orchestration logic

**Modules affected:** Admissions, onboarding flows, multi-stage approval forms.

---

### 7. Cross-Field Validation Rules

**Example:**

```
Rule 1: End Date must be after Start Date
Rule 2: If Discount > 50%, require Manager Approval flag
Rule 3: Phone number must be unique across the entire system
        (not just within this doctype — checked against students,
         employees, parents tables too)
Rule 4: Username must not contain spaces or special characters
```

**Why it cannot work:**
- The dynamic engine validates: required, min length, max length, unique within one table
- It cannot validate relationships between two fields on the same form
- It cannot run checks against external tables or services
- It cannot trigger conditional requirements based on other values

**Modules affected:** Any module with business-specific validation rules beyond simple required/max-length.

---

### 8. Custom Actions / Workflows

**Example:**

```
After creating a student record:
  → auto-generate Admission Number
  → send welcome SMS to parent
  → create default fee allocation

After approving a leave request:
  → update attendance records
  → notify the employee
  → update leave balance
```

**Why it cannot work:**
- The dynamic engine does: create record, update record, delete record
- It has no post-save hook, workflow trigger, or side-effect model
- These actions require custom backend service logic per module

**Modules affected:** Admissions, HR leave management, fee payment, any module with workflows.

---

## Summary Table

| Feature | Supported | Example |
|---|---|---|
| Simple fields (text, email, phone, etc.) | ✓ | Name, Email, Phone |
| Static dropdown | ✓ | Gender, Status, Type |
| Linked record dropdown (one-to-one) | ✓ | Class → Location |
| File / photo upload | ✓ | Student photo, Logo |
| Multiple addresses | ✓ | Organisation addresses |
| Location scoping | ✓ | Branch-wise data filter |
| Active / Notes fields | ✓ | Any module |
| Pagination, search, sort, filter | ✓ | All list pages |
| Bulk delete, import, export | ✓ | All list pages |
| Permission-gated actions | ✓ | All pages |
| **Multi-table save** | ✗ | User + user_locations |
| **Permission matrix** | ✗ | Group → Menu → Permissions |
| **Conditional field visibility** | ✗ | Show field based on another value |
| **Auto-fill from linked record** | ✗ | Select employee → fill form |
| **Computed / formula fields** | ✗ | Fee total calculation |
| **Child record sub-tables** | ✗ | Fee items, order lines |
| **Multi-step wizard** | ✗ | Admission form |
| **Cross-field validation** | ✗ | End date > Start date |
| **Post-save workflows** | ✗ | Auto-generate admission number |

---

## Decision Rule

```
Ask one question before choosing the approach:

"Does this module do more than
 save simple fields for one record?"
        │
        ├── NO  → Use dynamic builder. Zero code needed.
        │         Examples: Master data, lookup tables,
        │         simple reference records.
        │
        └── YES → Write a dedicated module component.
                  Examples: Users, Groups, Admissions,
                  Fee structures, Timetables, Payroll.
```

---

## One-Line Statement for Stakeholders

> The dynamic builder handles any module where one form saves one record with simple fields — these are built with zero code.
> The moment a module needs to save across multiple tables, show a matrix interface, conditionally show or hide fields, compute values, manage child rows, or trigger workflows — it requires a dedicated component.
> These are not limitations of our implementation. They are the architectural boundaries of any generic form builder — including industry tools like Google Forms, Airtable, and Zoho Creator.
