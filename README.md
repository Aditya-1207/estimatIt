# estimatIt

> A BOQ estimation tool for civil engineers working on Maharashtra PWD public works projects.

## Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9
- A [Supabase](https://supabase.com) project (free tier)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Aditya-1207/estimatIt.git
cd estimatIt

# 2. Install dependencies (all workspaces)
npm install

# 3. Set up environment variables
cp .env.example apps/web/.env
# Edit apps/web/.env with your Supabase project URL and anon key

# 4. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
estimatIt/
├── apps/
│   └── web/              # React + Vite frontend (PWA)
├── packages/
│   └── shared/           # Shared Zod schemas, types, constants
├── spec/                 # Specification documents
│   ├── mission.md
│   ├── techstack.md
│   └── spec.md
├── attached_assets/      # Reference PDFs (SSR, estimation samples)
└── package.json          # Root workspace config
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking across all workspaces |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: TanStack Query, Zustand
- **Routing**: Wouter

See [spec/techstack.md](spec/techstack.md) for full details.

## License

MIT
