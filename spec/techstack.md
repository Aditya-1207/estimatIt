# Tech Stack

## Architecture Strategy

The application needs to serve two modes of use:

1. **Office Mode (Desktop/Laptop)** — Full-featured web app for reviewing estimates, managing projects, SSR lookups, and exporting deliverables.
2. **Site Mode (Mobile/Tablet)** — Lightweight, offline-capable interface for entering dimensions at construction sites where internet may be unreliable or absent.

Both modes are served by a single **Progressive Web App (PWA)** in the MVP, with a future **React Native** mobile app sharing the same backend and type definitions.

The entire stack must operate within **free-tier limits** — this is a single-user personal tool, not a SaaS product.

---

## Frontend

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18 + TypeScript | Strong ecosystem, type safety, component reuse with future React Native app. |
| **Build Tool** | Vite | Fast HMR in development, optimized production builds. |
| **PWA** | `vite-plugin-pwa` (Workbox) | Service worker for offline caching, installable on mobile home screen, background sync when connectivity returns. |
| **Styling** | Tailwind CSS v3 | Utility-first CSS for rapid, responsive layouts. Already used in the existing prototype. |
| **UI Components** | shadcn/ui (Radix UI primitives) | Accessible, composable, and unstyled-by-default components. Already adopted in the prototype. |
| **Routing** | Wouter | Lightweight (~1.5KB) client-side routing. Sufficient for a small number of pages. |
| **Server State** | TanStack Query (React Query) | Caching, background refetching, and `PersistQueryClient` for offline persistence to IndexedDB. |
| **Local State** | Zustand | Minimal boilerplate store for undo/redo history, UI state, and draft measurement data. |
| **Forms** | React Hook Form + Zod | Performant form handling with schema-based validation (Zod schemas shared with backend). |
| **Charts/Visuals** | Recharts | For optional dashboard statistics (project counts, total estimates). |
| **Icons** | Lucide React | Clean, consistent icon set already in use. |
| **Excel Export** | ExcelJS | Client-side `.xlsx` generation with formatting (borders, ₹ currency, merged cells, bold headers). |

---

## Backend & Database (BaaS)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Platform** | Supabase (Free Tier) | Provides PostgreSQL database, authentication, auto-generated REST/GraphQL APIs, and real-time subscriptions — all from a single hosted service with a generous free tier (500MB DB, 1GB storage, 50K monthly active users). |
| **Database** | PostgreSQL (via Supabase) | Relational data model is natural for the hierarchical structure: `Projects → Measurement Blocks → SSR Items → Dimension Rows`. |
| **Authentication** | Supabase Auth | Simple email/password login. Single user for now, but easily extensible. |
| **API** | Supabase JS Client (`@supabase/supabase-js`) | Direct client-to-database queries with Row Level Security (RLS). No custom backend server needed for CRUD operations. |
| **Edge Functions** | Supabase Edge Functions (Deno) | For any server-side logic that can't run on the client (e.g., SSR PDF parsing/import pipeline, complex report generation). |
| **File Storage** | Supabase Storage | For storing uploaded SSR PDFs and generated Excel/PDF exports. |

### Why Supabase over Express + Neon (existing stack)?

The existing prototype used Express.js + Neon PostgreSQL + custom API routes. Supabase replaces all of that with:
- **No custom server code** for standard CRUD — the Supabase JS client talks directly to PostgreSQL with RLS.
- **Built-in auth** — no Passport.js/express-session needed.
- **Free tier** that includes DB + Auth + Storage + Edge Functions.
- **Better offline story** — Supabase's client library works well with TanStack Query's persistence layer.

---

## Offline Strategy

| Concern | Solution |
|---------|----------|
| **App Shell Caching** | Service worker (via vite-plugin-pwa) caches HTML, JS, CSS so the app opens without internet. |
| **Data Persistence** | TanStack Query's `PersistQueryClient` stores query cache in IndexedDB. Draft measurements are saved to Zustand store backed by `localStorage` or IndexedDB. |
| **Sync on Reconnect** | When connectivity returns, pending mutations (new/edited measurements) are flushed to Supabase via TanStack Query's `onlineManager` and mutation retry logic. |
| **SSR Data** | The full Maharashtra PWD SSR dataset (~2000 items) is small enough to cache locally in IndexedDB for offline type-ahead search. |

---

## Shared Type Definitions

Zod schemas defined in a `shared/` directory are the single source of truth for:
- Database table shapes
- API request/response validation
- Form validation on the frontend
- Future React Native app types

---

## Future: Mobile App

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React Native + Expo | Share TypeScript types, Zod schemas, and Supabase client code with the web app. Expo simplifies build/deploy. |
| **Offline Storage** | Expo SQLite or WatermelonDB | Local-first database on the device for site data entry. |
| **Sync** | Supabase Realtime + custom sync logic | Bidirectional sync between local SQLite and Supabase PostgreSQL. |

---

## Deployment

| Service | Tier | Purpose |
|---------|------|---------|
| **Vercel** | Free | Host the Vite/React PWA. Automatic deploys from GitHub. |
| **Supabase** | Free | PostgreSQL DB, Auth, Storage, Edge Functions. |
| **GitHub** | Free | Source control and CI/CD triggers. |

### Free Tier Limits (Supabase)

| Resource | Limit | Sufficient? |
|----------|-------|-------------|
| Database size | 500 MB | Yes — SSR data + projects data will be well under 50 MB. |
| Auth users | 50,000 MAU | Yes — single user. |
| Storage | 1 GB | Yes — PDFs and exports are small. |
| Edge Function invocations | 500K/month | Yes — minimal server-side processing. |
| Bandwidth | 5 GB/month | Yes — single user with small payloads. |
