# Product Specification - estimatIt

> Version: 1.0 - Phased MVP
> Last Updated: July 2026

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [User Roles](#2-user-roles)
3. [Pages & Screens](#3-pages--screens)
4. [Government Estimation Format](#4-government-estimation-format)
5. [Phase Overview](#5-phase-overview)
6. [Feature Specifications](#6-feature-specifications)
   - Phase 1: [Project Setup & Foundation](#phase-1-project-setup--foundation)
   - Phase 2: [Authentication](#phase-2-authentication)
   - Phase 3: [SSR Data Pipeline](#phase-3-ssr-data-pipeline)
   - Phase 4: [Project Management](#phase-4-project-management)
   - Phase 5: [Measurement Sheet - Data Entry](#phase-5-measurement-sheet---data-entry)
   - Phase 6: [Measurement Sheet - UX Enhancements](#phase-6-measurement-sheet---ux-enhancements)
   - Phase 7: [Excel Export](#phase-7-excel-export)
   - Phase 8: [PWA & Offline Support](#phase-8-pwa--offline-support)
   - Phase 9: [Abstract Sheet](#phase-9-abstract-sheet)
   - Phase 10: [Recapitulation Sheet](#phase-10-recapitulation-sheet)
   - Phase 11: [Template Projects](#phase-11-template-projects)
   - Phase 12: [PDF Export](#phase-12-pdf-export)
   - Phase 13: [Mobile App Foundation](#phase-13-mobile-app-foundation)
7. [Data Models](#7-data-models)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Out of Scope (v1.0)](#9-out-of-scope-v10)

---

## 1. App Overview

estimatIt is a single-user web application (PWA) built for a consultant civil engineer working with a **local municipal corporation in Maharashtra, India**. It digitises:

- Measurement recording (dimensions taken at construction sites)
- Maharashtra PWD State Schedule of Rates (SSR) lookup and auto-fill
- Automatic quantity and amount calculations
- Government-standard estimation sheet generation (Excel/PDF export)

**Current workflow** (manual, being replaced):
```
Site visit → Paper notes → SSR lookup from colleague's Excel → Calculator → Excel expert types it up
```

**Target workflow** (with estimatIt):
```
Site visit → Enter dimensions in estimatIt (mobile/desktop) → App calculates → Export Excel
```

**Access model**: Login required for all features. Single user (the engineer).

---

## 2. User Roles

| Role | Description | Count (v1.0) |
|------|-------------|--------------|
| **Engineer / Owner** | Full access to all features | 1 (single) |
| *(Future: Team members)* | Shared access to projects | Planned v2.0 |

---

## 3. Pages & Screens

| Route | Page | Access | Introduced In |
|-------|------|--------|---------------|
| `/login` | Login | Public (redirects to dashboard if already logged in) | Phase 2 |
| `/` | Project Dashboard | Auth required | Phase 4 |
| `/project/:id` | Measurement Sheet Editor | Auth required | Phase 5 |
| `/ssr` | SSR Browser (read-only reference) | Auth required | Phase 3 |

---

## 4. Government Estimation Format

A standard Maharashtra municipal corporation estimation sheet consists of these sections. Understanding this format drives the entire application design.

### 4.1. Measurement Sheet ⭐ (MVP Priority)

The detailed dimension-by-dimension breakdown. This is where the engineer records every physical measurement from the site.

**Excel columns:** `Sr No | Description | No | Length | Breadth | Depth/Height | Quantity`

**Block structure:**
```
Row 1:  [1]  [SSR 5.14: Earth work in excavation in foundation... ————————]
Row 2:       [Gents Toilet]
Row 3:       [  Septic Tank]                      [2]  [3.00] [2.00] [1.50]  [18.00]
Row 4:       [  Water Tank]                       [1]  [2.00] [1.50] [1.00]  [ 3.00]
Row 5:       [  Plinth Beam]                      [4]  [5.00] [0.30] [0.45]  [ 2.70]
Row 6:       [Ladies Toilet]
Row 7:       [  Septic Tank]                      [2]  [3.00] [2.00] [1.50]  [18.00]
Row 8:       [  Steps]                            [1]  [1.20] [0.90] [0.15]  [ 0.16]
                                                                Block Total:   41.86
─────────────────────────────────────────────────────────────────────────────────────
Row 9:  [2]  [SSR 7.01: Providing and laying PCC 1:4:8 ——————————————————]
...
```

**Hierarchy rules:**
- **SSR Item row** — description spans across all columns (merged cells in Excel). Bold.
- **Major Item row** — label only (e.g., "Gents Toilet"). No dimensions. Semi-bold.
- **Minor Item rows** — actual dimensions: No, Length, Breadth, Depth. Normal weight, indented.
- `Quantity = No × Length × Breadth × Depth` (auto-calculated per row).
- Block total = sum of all minor item quantities under that SSR item.

### 4.2. Abstract Sheet

Summary table. One row per SSR item, showing total quantity (from measurement sheet), unit, rate, and amount.

| Sr No | Particulars / Description | Quantity | Unit | Rate (₹) | Amount (₹) |
|-------|---------------------------|----------|------|-----------|-------------|
| 1 | Earth work in excavation... | 41.86 | Cum | 180.00 | 7,534.80 |
| 2 | PCC 1:4:8 mix cement... | 12.50 | Cum | 600.00 | 7,500.00 |
| | | | | **Total** | **₹15,034.80** |

### 4.3. Recapitulation Sheet

Applies percentage-based additions to the estimated cost:
- Contingency charges (e.g., 3%)
- Quality Control charges (e.g., 1%)
- Insurance (e.g., 1%)
- GST (e.g., 18%)
- Leads & lifts
- Departmental charges

### 4.4. Rate Analysis

Breakdown of how each SSR rate is derived from constituent materials, labor, and equipment costs.

> **Note:** Rate Analysis is out of scope for all planned phases. SSR rates are used as-is.

---

## 5. Phase Overview

Each **feature (F)** is scoped to a single git commit.
Each **phase (P)** is a logical group of commits that can be tagged/released together.

### Core MVP (Phases 1–8)

| Phase | Name | Features | Description |
|-------|------|----------|-------------|
| **P1** | Project Setup & Foundation | 3 | Monorepo, Supabase, frontend shell |
| **P2** | Authentication | 2 | Supabase Auth login, auth guard |
| **P3** | SSR Data Pipeline | 3 | SSR schema, data import, browser UI |
| **P4** | Project Management | 2 | Project CRUD API, dashboard UI |
| **P5** | Measurement Sheet - Data Entry | 4 | Block, major item, minor item entry with live calculations |
| **P6** | Measurement Sheet - UX Enhancements | 4 | Auto-save, undo/redo, keyboard nav, drag reorder |
| **P7** | Excel Export | 2 | Measurement sheet Excel generation with government formatting |
| **P8** | PWA & Offline Support | 2 | Service worker, offline data entry & sync |

### Enhancements (Phases 9–13)

| Phase | Name | Features | Description |
|-------|------|----------|-------------|
| **P9** | Abstract Sheet | 2 | Auto-generated abstract from measurement data |
| **P10** | Recapitulation Sheet | 2 | Percentage-based additions, configurable charges |
| **P11** | Template Projects | 2 | Mark as template, clone from template |
| **P12** | PDF Export | 1 | Print-ready PDF of measurement/abstract sheets |
| **P13** | Mobile App Foundation | 2 | React Native Expo scaffold, dimension entry screen |

**Total: 13 phases, 31 features**

---

## 6. Feature Specifications

---

### Phase 1: Project Setup & Foundation

> **Goal**: Get a working monorepo with a running frontend shell, Supabase connection, and design system. This underpins all subsequent phases.

---

#### F1.1 - Monorepo Scaffolding

Set up the monorepo structure with npm workspaces.

**Deliverables**:
- Root `package.json` with npm workspaces configuration
- `apps/web/` — Vite + React 18 + TypeScript project
- `packages/shared/` — shared TypeScript types and Zod schemas
- `.gitignore`, `.env.example` files
- `README.md` with local setup instructions

**Monorepo structure**:
```
estimatIt/
├── packages/
│   └── shared/           # Shared Zod schemas, types, constants
├── apps/
│   └── web/              # React + Vite frontend (PWA)
├── spec/                 # Specification documents
├── .gitignore
├── .env.example
├── package.json          # Root workspace config (npm workspaces)
└── README.md
```

> **Note:** No separate backend server directory. Supabase handles the backend. Edge Functions (if needed later) live in a `supabase/functions/` directory.

---

#### F1.2 - Supabase Connection & Base Configuration

Connect the frontend to Supabase and set up the database schema foundation.

**Deliverables**:
- Supabase project creation (free tier)
- `@supabase/supabase-js` client configured in `apps/web/src/lib/supabase.ts`
- Environment variable validation on app startup (using Zod)
- Base Supabase configuration: project URL, anon key

**Environment Variables** (`.env`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

#### F1.3 - Frontend App Shell

Set up the frontend shell with routing, layout, and design system foundation.

**Deliverables**:
- Wouter routing with route definitions (placeholder pages for `/`, `/login`, `/project/:id`, `/ssr`)
- App layout component (header + main content area)
- CSS Variables design system: colors (blue-600 primary palette), typography, spacing, shadows
- Google Fonts: Inter loaded
- Responsive shell (works on mobile and desktop)
- Tailwind CSS configured with shadcn/ui components initialized
- A simple "Not Found" (404) page

**Design System (CSS Variables)**:
```css
:root {
  --color-primary: #2563eb;      /* blue-600 */
  --color-primary-hover: #1d4ed8; /* blue-700 */
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --font-family: 'Inter', sans-serif;
  --radius-md: 12px;             /* rounded-2xl cards */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  /* etc. */
}
```

---

### Phase 2: Authentication

> **Goal**: Engineer can log in with email/password via Supabase Auth. All app routes are protected.

---

#### F2.1 - Supabase Auth Setup

Configure Supabase Authentication for email/password login.

**Deliverables**:
- Supabase Auth enabled with email/password provider
- Single user account created (the engineer's email)
- Auth helper functions in `apps/web/src/lib/auth.ts`:
  - `signIn(email, password)` — login
  - `signOut()` — logout
  - `getSession()` — check current session
  - `onAuthStateChange()` — listen for auth changes
- Row Level Security (RLS) policies enabled on all tables:
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE` allowed only when `auth.uid()` matches `user_id`

---

#### F2.2 - Login Page & Auth Guard

Build the login UI and protect all app routes.

**Deliverables**:
- `/login` page with email + password form (React Hook Form + Zod validation)
- Auth state management using Zustand (stores session, login/logout actions)
- `ProtectedRoute` wrapper component — checks auth state, redirects to `/login` if unauthenticated
- Silent session restore on app load (Supabase handles this via stored refresh token)
- Redirect logic: if already logged in, `/login` redirects to `/`
- Loading state while auth is being checked (prevents flash of login screen)

---

### Phase 3: SSR Data Pipeline

> **Goal**: Maharashtra PWD SSR data is loaded into the database and browsable/searchable from the app. This is a prerequisite for the measurement sheet.

---

#### F3.1 - SSR Database Schema

Create the Supabase tables for SSR data.

**Deliverables**:
- `ssr_versions` table (see [Data Models](#7-data-models))
- `ssr_items` table (see [Data Models](#7-data-models))
- Shared Zod schemas in `packages/shared/` for both tables
- RLS policies: read access for authenticated users (SSR data is read-only from the app)

**Supabase Migration** (`supabase/migrations/001_ssr_tables.sql`):
- Table creation with indexes on `item_code` and `description` (for fast search)
- Full-text search index on `description` column for type-ahead

---

#### F3.2 - SSR Data Import Script

Parse the Maharashtra PWD SSR PDF and load the data into Supabase.

**Deliverables**:
- Node.js script (`scripts/import-ssr.ts`) that:
  1. Reads the SSR PDF (`attached_assets/SSR_1751826513462.pdf`)
  2. Extracts item code, description, unit, and rate using `pdf-parse` or similar
  3. Inserts all items into the `ssr_items` table via Supabase client
  4. Creates a corresponding `ssr_versions` record (e.g., "Maharashtra PWD 2024-25")
  5. Logs import progress and any parsing errors
- Idempotent: can be re-run without duplicating data (upsert by item_code + ssr_version)
- Fallback: if PDF parsing is unreliable, a cleaned JSON/CSV file can be used as the source

---

#### F3.3 - SSR Browser Page

A read-only reference page to browse and search all SSR items.

**URL**: `/ssr`

**Deliverables**:
- Searchable table of all SSR items from the active SSR version
- Search bar: partial match on item code or description (case-insensitive)
- Table columns: Item Code | Description | Unit | Rate (₹) | Category
- Pagination (default 50 per page)
- Active SSR version displayed in a banner at the top (e.g., "Maharashtra PWD 2024-25")
- Loading, empty, and error states

---

### Phase 4: Project Management

> **Goal**: Engineer can create, view, and delete estimation projects from a dashboard.

---

#### F4.1 - Project CRUD (Database & Logic)

Set up the project table and data access.

**Deliverables**:
- `projects` table in Supabase (see [Data Models](#7-data-models))
- Shared Zod schemas for project creation and update in `packages/shared/`
- RLS policies: full CRUD for the authenticated user (`user_id = auth.uid()`)
- Supabase client functions in `apps/web/src/lib/projects.ts`:
  - `listProjects()` — all projects, ordered by `updated_at` desc
  - `getProject(id)` — single project by ID
  - `createProject(data)` — create new project
  - `updateProject(id, data)` — update project metadata
  - `deleteProject(id)` — delete project and all related measurement data (cascade)

---

#### F4.2 - Project Dashboard UI

**URL**: `/`

**Deliverables**:
- Project list displayed as cards or table rows:
  - Project name
  - Work order number (if set)
  - Item count (number of measurement blocks)
  - Total estimated amount (₹)
  - Last modified date
- "Create New Project" button — opens a dialog/form:
  - Fields: Name (required), Work Order No (optional)
  - On success → navigate to `/project/:id`
- Delete project button with confirmation dialog ("This will delete all measurements. Are you sure?")
- Empty state when no projects exist ("Create your first estimation project")
- Search/filter by project name
- Loading and error states

---

### Phase 5: Measurement Sheet - Data Entry

> **Goal**: Engineer can enter measurement data in the hierarchical format: SSR Item → Major Item → Minor Items with dimensions. Live calculations work in real-time.

---

#### F5.1 - Measurement Data Schema

Create the Supabase tables for the measurement sheet hierarchy.

**Deliverables**:
- `measurement_blocks` table (see [Data Models](#7-data-models))
- `major_items` table (see [Data Models](#7-data-models))
- `dimension_rows` table (see [Data Models](#7-data-models))
- Shared Zod schemas for all three tables in `packages/shared/`
- RLS policies: full CRUD for authenticated user (via project → user_id chain)
- Cascade deletes: deleting a block deletes its major items and dimension rows
- Supabase client functions in `apps/web/src/lib/measurements.ts`

---

#### F5.2 - SSR Item Selector (Type-ahead Combobox)

The searchable SSR item selector used when adding a new measurement block.

**Deliverables**:
- Reusable `SSRCombobox` component:
  - Type-ahead search input with debounced queries (300ms)
  - Searches `ssr_items` by item code or description keywords (partial, case-insensitive)
  - Dropdown shows matching items: `[Item Code] — [Description] | [Unit] | ₹[Rate]`
  - On selection: auto-fills unit and rate with visual confirmation badge (green, e.g., "₹165 — Rate auto-filled from SSR")
  - Maximum 10 results per query
- Fallback: "Item not found? Enter custom description and rate" option at the bottom of the dropdown
  - When selected, shows text fields for custom description, unit (from predefined dropdown), and rate

**Unit dropdown options**: m, m² (Sqm), m³ (Cum), ft, kg, Rmt (Running Meter), LS (Lump Sum), Nos, Each, Quintal, Tonne, Litre

---

#### F5.3 - Measurement Block & Major Item Entry

Adding SSR item blocks and major item labels to a project.

**URL**: `/project/:id`

**Deliverables**:
- **Add Measurement Block** button:
  - Opens the SSR Combobox (F5.2) to select an SSR item
  - Creates a new block with the selected SSR item, auto-incrementing `sequence_number`
  - Block header displays: `[Sr No]. [SSR Item Code]: [Description]` (full width, bold, blue accent)
  - Unit and rate shown as badges on the block header
- **Add Major Item** button (within a block):
  - Simple text input for the major item description (e.g., "Gents Toilet")
  - Creates a label row under the block, auto-incrementing `sequence_number`
  - Displayed as semi-bold, indented text
- Block and major item entries are rendered in a vertical list mirroring the measurement sheet layout
- Empty state per block: "Add a major item (e.g., 'Gents Toilet')"

---

#### F5.4 - Dimension Row Entry & Live Calculations

Adding minor item measurements with dimensions and real-time quantity calculation.

**Deliverables**:
- **Add Dimension Row** button (within a major item):
  - Inline form/row with fields: Description (text), No (number), Length (number), Breadth (number), Depth (number)
  - All number fields default to empty, accept decimals
- **Live Quantity Calculation**:
  - `Quantity = No × Length × Breadth × Depth` — computed on every keystroke
  - Displayed in the last column, right-aligned, 2 decimal places
  - If any dimension is 0 or empty, quantity = 0 (graceful handling)
- **Block Total**:
  - Sum of all dimension row quantities across all major items in the block
  - Displayed at the bottom of each block in bold
- **Project Grand Total**:
  - Sum of all block totals × their respective SSR rates
  - Displayed in a sticky footer or summary bar: "Estimated Total: ₹XX,XXX.XX"
- **Inline editing**: Click any field to edit in place. No modal dialogs.
- **Delete row**: Each dimension row has a delete button (with confirmation for non-empty rows)
- **Delete major item**: Deletes the label and all its dimension rows (with confirmation)

---

### Phase 6: Measurement Sheet - UX Enhancements

> **Goal**: Polish the measurement sheet editor with auto-save, undo/redo, keyboard navigation, and reordering to make data entry fast and error-tolerant.

---

#### F6.1 - Auto-save

Automatically persist all changes without a manual save button.

**Deliverables**:
- All mutations (add/edit/delete blocks, major items, dimension rows) trigger a debounced save (500ms after last change)
- TanStack Query mutations with optimistic updates:
  - UI updates immediately
  - Background sync to Supabase
  - If sync fails, show a non-blocking toast: "Save failed. Retrying..."
  - Retry up to 3 times with exponential backoff
- Visual save indicator in the header:
  - "Saving..." (during sync)
  - "All changes saved" (after successful sync)
  - "Offline — saved locally" (when no internet, see Phase 8)
- Pending changes stored in TanStack Query mutation cache (survives page refresh via PersistQueryClient)

---

#### F6.2 - Undo / Redo

Allow the user to undo and redo data entry actions.

**Deliverables**:
- Zustand store with undo/redo middleware (`zundo` or custom implementation)
- Tracks the last 50 actions (add, edit, delete of dimension rows, major items, blocks)
- **Keyboard shortcuts**: `Ctrl+Z` (undo), `Ctrl+Y` or `Ctrl+Shift+Z` (redo)
- **UI buttons**: Undo and Redo icons in the measurement sheet toolbar
- Buttons disabled when there's nothing to undo/redo
- Toast notification on undo: "Undone: deleted dimension row 'Septic Tank'"
- Undo/redo triggers the same auto-save flow (F6.1)

---

#### F6.3 - Keyboard Navigation

Enable rapid data entry without leaving the keyboard.

**Deliverables**:
- **Tab** moves focus through dimension fields in order: Description → No → Length → Breadth → Depth → (next row) Description
- **Enter** on the last field (Depth) of a dimension row auto-creates a new empty row below and focuses its Description field
- **Escape** cancels editing the current field and reverts to the saved value
- **Arrow Up / Arrow Down** move between dimension rows within the same major item
- Auto-focus: when a new block, major item, or dimension row is added, the first editable field is auto-focused
- Number fields: only accept numeric input + decimal point. Invalid characters silently rejected.

---

#### F6.4 - Drag & Drop Reordering

Allow reordering of measurement blocks, major items, and dimension rows.

**Deliverables**:
- Drag handle (grip icon) on each block, major item, and dimension row
- Blocks can be reordered within the project (updates `sequence_number`)
- Major items can be reordered within a block
- Dimension rows can be reordered within a major item
- Drag & drop implemented with a lightweight library (e.g., `@dnd-kit/core`)
- Reorder updates are auto-saved (F6.1)
- Sr No in the block header updates automatically after reorder

---

### Phase 7: Excel Export

> **Goal**: Generate a properly formatted Excel file matching the government Measurement Sheet format.

---

#### F7.1 - Measurement Sheet Excel Generation

Generate an `.xlsx` file with the measurement sheet data in government format.

**Deliverables**:
- "Export to Excel" button in the project header (blue, prominent)
- Client-side Excel generation using ExcelJS
- Output file: `{project_name}_measurement_sheet.xlsx`

**Excel Layout**:
- **Header rows**: Project name, work order number, date, SSR version
- **Column headers**: Sr No | Description | No | Length | Breadth | Depth/Height | Quantity
- **SSR item rows**: Bold, merged across all 7 columns
- **Major item rows**: Indented (2 spaces), semi-bold, no dimension values
- **Dimension rows**: Indented (4 spaces), normal weight, right-aligned numbers (2 decimal places)
- **Block subtotal row**: Bold, right-aligned quantity total at the bottom of each block
- **Formatting**:
  - All cells bordered (thin black borders)
  - Numbers right-aligned, 2 decimal places
  - ₹ currency formatting on rate/amount columns
  - Column widths auto-fitted to content
  - Font: Calibri 11pt (standard for government documents)
  - Header row: bold, centered, slightly larger font

---

#### F7.2 - Export Validation & Error Handling

Ensure the export is clean and handles edge cases.

**Deliverables**:
- Pre-export validation:
  - Warn if any measurement blocks have zero dimension rows
  - Warn if any blocks are missing SSR item assignments
  - Show a confirmation dialog with warnings before exporting
- Empty project: disable export button with tooltip "Add measurements before exporting"
- Export progress indicator for large projects
- Error toast if Excel generation fails, with "Try again" action
- After successful export, show a success toast with the filename

---

### Phase 8: PWA & Offline Support

> **Goal**: The app works offline at construction sites. Measurements entered without internet sync automatically when connectivity returns.

---

#### F8.1 - Service Worker & App Shell Caching

Make the app installable and load without internet.

**Deliverables**:
- `vite-plugin-pwa` configured with Workbox:
  - Precache all static assets (HTML, JS, CSS, fonts, icons)
  - Runtime cache for Supabase API responses (stale-while-revalidate strategy)
- Web App Manifest (`manifest.json`):
  - App name: "estimatIt"
  - Theme color: blue-600
  - Icons: 192px and 512px variants
  - Display: standalone
  - Start URL: `/`
- "Install App" prompt on first visit (for both desktop and mobile Chrome)
- App loads and renders within 2 seconds even on a slow 3G connection (after first visit)

---

#### F8.2 - Offline Data Entry & Sync

Enable dimension entry without internet and sync when online.

**Deliverables**:
- **SSR Data Caching**: Full SSR item list cached in IndexedDB on first load (~2000 items, < 1MB). Type-ahead search works offline.
- **Offline Mutations**:
  - TanStack Query `onlineManager` integration
  - When offline, mutations (add/edit/delete) are queued in `PersistQueryClient` (IndexedDB)
  - UI works normally — optimistic updates show data immediately
- **Sync on Reconnect**:
  - When internet returns, queued mutations replay in order to Supabase
  - Visual indicator: "Syncing X changes..." → "All changes synced ✓"
  - Conflict resolution: last-write-wins (single user, conflicts are unlikely)
- **Connection Status Indicator** (persistent in header):
  - 🟢 Green dot: Online, synced
  - 🟡 Amber dot: Syncing...
  - 🔴 Red dot: Offline — saved locally
- **Project data caching**: Previously viewed project data remains accessible offline via cached query responses

---

### Phase 9: Abstract Sheet

> **Goal**: Auto-generate the Abstract sheet from measurement block totals. Include it in Excel exports.

---

#### F9.1 - Abstract Calculation & UI

Display the Abstract as a summary view within the project.

**Deliverables**:
- **Abstract tab/view** on the project page (toggle between Measurement Sheet and Abstract)
- Auto-generated table with one row per measurement block:
  - Sr No (same as block sequence)
  - Description (SSR item description)
  - Quantity (block total from measurement sheet)
  - Unit (from SSR item)
  - Rate ₹ (from SSR item or custom rate)
  - Amount ₹ (quantity × rate)
- **Grand Total** row at the bottom
- Read-only — all data derived from the measurement sheet
- Automatically updates when measurement data changes

---

#### F9.2 - Abstract in Excel Export

Add the Abstract as a second sheet in the Excel export workbook.

**Deliverables**:
- Excel workbook now contains two sheets:
  - Sheet 1: "Measurement Sheet" (existing from F7.1)
  - Sheet 2: "Abstract"
- Abstract sheet layout:
  - Header: Project name, work order number, date
  - Table columns: Sr No | Particulars | Quantity | Unit | Rate (₹) | Amount (₹)
  - Bold total row at the bottom
  - Same formatting standards as measurement sheet (borders, currency, fonts)

---

### Phase 10: Recapitulation Sheet

> **Goal**: Add configurable percentage-based charges (contingency, GST, insurance, etc.) on top of the estimated cost.

---

#### F10.1 - Recapitulation Configuration

Allow the user to configure percentage additions for a project.

**Deliverables**:
- `recapitulation_items` table in Supabase:
  - `id`, `project_id`, `description`, `percentage`, `sequence_number`
  - Default items seeded on project creation:
    - Contingency charges (3%)
    - Quality Control (1%)
    - Insurance (1%)
    - GST (18%)
  - User can add, edit, reorder, or remove items per project
- UI: Editable list on the project page (separate tab/section after Abstract)
- Calculations:
  - Each item's amount = `percentage × subtotal from Abstract`
  - Running total displayed
  - **Final Estimated Cost** = Abstract total + sum of all recap additions

---

#### F10.2 - Recapitulation in Excel Export

Add the Recapitulation as a third sheet in the Excel export workbook.

**Deliverables**:
- Excel workbook now contains three sheets:
  - Sheet 1: "Measurement Sheet"
  - Sheet 2: "Abstract"
  - Sheet 3: "Recapitulation"
- Recapitulation sheet layout:
  - Row 1: "Estimated Cost as per Abstract" — ₹ amount
  - Subsequent rows: each configured addition (description, percentage, amount)
  - Final row: **Total Estimated Cost** (bold, bordered)

---

### Phase 11: Template Projects

> **Goal**: Engineer can save a project as a template and create new projects by cloning templates — useful for recurring estimation types (e.g., public toilet blocks, community halls).

---

#### F11.1 - Mark Project as Template & Template List

Allow projects to be saved as reusable templates.

**Deliverables**:
- `is_template` boolean field on the `projects` table
- "Save as Template" action on the project page (sets `is_template = true`)
- Template projects appear with a distinct badge on the dashboard
- Templates are not editable from the dashboard (they're cloned, not opened directly)
- **Seed template**: A pre-loaded template project based on the reference estimation document (public toilet block with measurement blocks, major items, and sample dimension rows pre-filled)

---

#### F11.2 - Clone from Template

Create a new project by cloning an existing template.

**Deliverables**:
- "Create from Template" option in the project creation flow
- Template picker: list of all template projects with name and item count
- On clone:
  - New project created with a user-provided name and optional work order number
  - All measurement blocks, major items, and dimension rows copied from the template
  - Quantities set to 0 (user fills in actual site dimensions)
  - SSR item references preserved
- Navigate to the new project after cloning

---

### Phase 12: PDF Export

> **Goal**: Generate print-ready PDF versions of the estimation sheets.

---

#### F12.1 - PDF Generation

Generate a PDF that matches the Excel layout for the measurement sheet and abstract.

**Deliverables**:
- "Export to PDF" button alongside the "Export to Excel" button
- Client-side PDF generation using `@react-pdf/renderer` or `jsPDF`
- PDF includes:
  - Measurement Sheet (same layout as the Excel version)
  - Abstract (same layout as the Excel version)
  - Recapitulation (if configured)
- A4 paper size, portrait orientation
- Professional header: project name, work order no, date, SSR version
- Page numbers in the footer
- Output file: `{project_name}_estimate.pdf`

**Performance Target**: PDF generation < 3 seconds for a project with 20 measurement blocks.

---

### Phase 13: Mobile App Foundation

> **Goal**: Scaffold a React Native (Expo) app that shares types with the web app and enables on-site dimension entry.

---

#### F13.1 - Expo App Scaffold

Set up the React Native project within the monorepo.

**Deliverables**:
- `apps/mobile/` — Expo (React Native) project added to the npm workspace
- Shared `packages/shared/` Zod schemas consumed by the mobile app
- Supabase client configured (same project, same auth)
- Basic navigation: Login → Project List → Measurement Entry
- Auth flow reusing Supabase email/password login

---

#### F13.2 - Mobile Dimension Entry Screen

A focused, mobile-optimized screen for entering dimensions at the site.

**Deliverables**:
- Project list screen (from Supabase, shows only non-template projects)
- Measurement entry screen for a selected project:
  - Shows existing blocks and major items (read-only labels)
  - "Add Dimension" button under each major item
  - Dimension form: Description, No, L, B, D (large touch-friendly inputs)
  - Numeric keyboard auto-opens for dimension fields
  - Live quantity calculation
- Offline support via Expo SQLite or AsyncStorage
- Sync to Supabase on reconnect (same last-write-wins strategy)

---

## 7. Data Models

> Models are introduced incrementally. The **Phase** column indicates when each model is first created.

### SSR Version (Phase 3)
```typescript
interface SSRVersion {
  id: string;              // UUID
  version: string;         // e.g., "2024-25"
  description?: string;    // e.g., "Maharashtra PWD Schedule of Rates"
  effective_date: Date;
  is_active: boolean;
  total_items: number;
  created_at: Date;
}
```

### SSR Item (Phase 3)
```typescript
interface SSRItem {
  id: string;              // UUID
  item_code: string;       // e.g., "3.02", "5.14"
  description: string;     // Full text description (English)
  unit: string;            // m, m², m³ (Cum), kg, Rmt, LS, etc.
  rate: number;            // Rate in ₹
  category: string;        // SSR chapter/section grouping
  ssr_version_id: string;  // FK → ssr_versions
  created_at: Date;
}
```

### Project (Phase 4)
```typescript
interface Project {
  id: string;              // UUID
  user_id: string;         // FK → auth.users
  name: string;            // e.g., "Public Toilet Block 8 Seats, Ward 7"
  work_order_no?: string;  // Municipal reference number
  is_template: boolean;    // Phase 11: cloneable template
  created_at: Date;
  updated_at: Date;
}
```

### Measurement Block (Phase 5)
```typescript
interface MeasurementBlock {
  id: string;              // UUID
  project_id: string;      // FK → projects
  sequence_number: number; // Sr No in the measurement sheet
  ssr_item_id?: string;    // FK → ssr_items (null if custom)
  custom_description?: string; // Used when SSR item not found
  custom_rate?: number;    // User-provided rate
  custom_unit?: string;    // User-provided unit
  created_at: Date;
  updated_at: Date;
}
```

### Major Item (Phase 5)
```typescript
interface MajorItem {
  id: string;              // UUID
  block_id: string;        // FK → measurement_blocks
  description: string;     // e.g., "Gents Toilet", "Ground Floor"
  sequence_number: number; // Ordering within the block
  created_at: Date;
}
```

### Dimension Row (Phase 5)
```typescript
interface DimensionRow {
  id: string;              // UUID
  major_item_id: string;   // FK → major_items
  description: string;     // e.g., "Septic Tank", "Plinth Beam"
  sequence_number: number; // Ordering within the major item
  number: number;          // No column (count of items)
  length: number;          // Length in meters
  breadth: number;         // Breadth in meters
  depth: number;           // Depth/Height in meters
  // quantity is COMPUTED: number × length × breadth × depth
  created_at: Date;
  updated_at: Date;
}
```

### Recapitulation Item (Phase 10)
```typescript
interface RecapitulationItem {
  id: string;              // UUID
  project_id: string;      // FK → projects
  description: string;     // e.g., "Contingency charges"
  percentage: number;      // e.g., 3.0
  sequence_number: number;
  created_at: Date;
}
```

---

## 8. Non-Functional Requirements

### Performance
- Initial page load: < 3 seconds on a 4G connection
- Measurement sheet renders smoothly with up to 50 blocks / 500 dimension rows
- Excel export: < 3 seconds for a full project
- PDF export: < 3 seconds for a full project
- SSR type-ahead search: < 200ms response time

### Security
- All data access controlled by Supabase RLS policies
- No sensitive data exposed in client-side code
- All user input validated with Zod schemas (shared between client and server)
- Supabase anon key is safe to expose (RLS enforces access control)

### Availability
- Target: 99.9% uptime (Supabase + Vercel free tier)
- PWA works offline after first load — no dependency on server availability for data entry

### Accessibility
- Keyboard navigable forms and measurement grid
- Adequate color contrast ratios (WCAG 2.1 AA)
- Focus indicators on all interactive elements

### Responsive Design
- Mobile (360px+): Dimension entry works comfortably (PWA at construction site)
- Tablet (768px+): Full measurement sheet visible
- Desktop (1024px+): Primary target for review, editing, and export

---

## 9. Out of Scope (v1.0)

The following are **explicitly deferred** to future versions:

| Feature | Target Version |
|---------|---------------|
| Multi-user / team access | v2.0 |
| SSR from other Indian states (non-Maharashtra) | v2.0 |
| Rate Analysis sheet generation | v2.0 |
| Automated dimension capture from drawings/CAD | v3.0 |
| Integration with e-tendering portals | v3.0 |
| Bulk import of dimensions from existing Excel files | v2.0 |
| Manual SSR item editing/adding from the app UI | v2.0 |
| Yearly SSR update workflow (upload new PDF, re-import) | v2.0 |
| WhatsApp/email sharing of estimates | v2.0 |
| Dark mode | v2.0 |
| Hindi/Marathi language support for UI | v3.0 |
