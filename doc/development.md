# Development Workflow Guide

> Replaces the stale SETUP_GUIDE.md. Consolidates setup and dev info from README.md and AGENTS.md.

## Prerequisites

- **Node.js** (latest LTS)
- **PostgreSQL** (running locally or remote)
- **Inngest CLI** (installed automatically via `npx`)
- _Optional_: **ComfyUI** — for local image generation (`localhost:8188`)
- _Optional_: **audio-gen** Python server — for audio generation

## Initial Setup

```bash
cd image-gen-web
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values (see Environment Variables below)

# Initialize database
npm run db:push

# Start development
npm run dev
```

## Environment Variables

Required in `.env.local`:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/image_gen_web"
OPENAI_API_KEY="your_openai_api_key"       # Required for default GPT Image 2 generation
GEMINI_API_KEY="your_gemini_api_key"
```

Optional:

```bash
INNGEST_EVENT_KEY="your_inngest_key"
INNGEST_SIGNING_KEY="your_signing_key"
OUTPUT_DIR="../image-gen/outputs"          # Image output directory (default)
OPENAI_IMAGE_MODEL="gpt-image-2"           # Optional; use snapshot ID to pin behavior
```

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently dev:next dev:inngest dev:audio` | Start all dev services |
| `dev:next` | `next dev` | Next.js dev server only |
| `dev:inngest` | `npx inngest-cli@latest dev` | Inngest dev dashboard |
| `dev:audio` | `cd ../audio-gen && launch.bat` | Audio generation Python server |
| `dev:devtools` | `npx @ai-sdk/devtools` | AI SDK DevTools inspector |
| `build` | `next build` | Production build |
| `start` | `next start` | Production server |
| `lint` | `eslint` | Run ESLint |
| `test` | `type:check + lint + vitest run` | Full validation suite (types + lint + tests) |
| `test:watch` | `vitest` | Watch mode |
| `test:ui` | `vitest --ui` | Vitest browser UI |
| `test:run` | `vitest run` | Single test pass |
| `test:coverage` | `vitest run --coverage` | Coverage report |
| `type:check` | `tsc --noEmit` | TypeScript type checking |
| `db:generate` | `drizzle-kit generate` | Generate migration files |
| `db:migrate` | `drizzle-kit migrate` | Run migrations |
| `db:push` | `drizzle-kit push` | Push schema directly to DB |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |

## Running the Dev Server

`npm run dev` starts three services concurrently:

1. **Next.js** (`localhost:3000`) — Web UI and API routes
2. **Inngest** (`localhost:8288`) — Background job dashboard
3. **audio-gen** — Python Flask server for audio generation (if available)

For Next.js only: `npm run dev:next`

## Database Operations

- **Schema changes**: Modify `lib/db/schema.ts` → run `npm run db:push`
- **View data**: `npm run db:studio` opens Drizzle Studio in browser
- **Migrations**: `npm run db:generate` → `npm run db:migrate` (for production)
- **Direct push**: `npm run db:push` (development — applies schema directly)

> **Important**: Always run `npm run db:push` after modifying schema.

## Testing

- **Framework**: Vitest with TypeScript support
- **Config**: `vitest.config.ts` and `vitest.setup.ts`
- **Location**: `*.test.ts` files colocated with source code
- **Full suite**: `npm run test` (includes type checking + linting + tests)
- **Watch mode**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`
- **Browser UI**: `npm run test:ui`

## Building for Production

```bash
npm run build    # Build Next.js application
npm start        # Start production server
```

## DevTools

- **AI SDK DevTools**: `npm run dev:devtools` — Inspect AI model calls, tool usage, and agent behavior
- **Drizzle Studio**: `npm run db:studio` — Browse and edit database
- **Inngest Dashboard**: `localhost:8288` when dev server is running — Monitor background jobs

## Common Issues

| Problem | Fix |
|---------|-----|
| Database connection errors | Ensure PostgreSQL is running and `DATABASE_URL` is correct |
| Inngest not processing jobs | Check Inngest dashboard at `localhost:8288` |
| Audio generation failing | Ensure audio-gen server is running (`cd ../audio-gen && launch.bat`) |
| ComfyUI images failing | Ensure ComfyUI is running on `localhost:8188` |
| OpenAI images failing | Ensure `OPENAI_API_KEY` is set and the account has GPT Image 2 access |
