# Setup Guide

## What's Been Set Up (Phase 1 Complete ✅)

### 1. Next.js 15 Project
- TypeScript configured
- Tailwind CSS configured
- App Router structure
- Basic navigation and layout

### 2. Database (Drizzle ORM + PostgreSQL)
- Complete schema defined with 6 tables:
  - `styles`: Art style definitions with versioning
  - `prompts`: Prompt templates with variables
  - `batches`: Generation batch configurations
  - `batch_prompts`: Many-to-many join table
  - `generations`: Individual generation runs
  - `images`: Generated image records
- Drizzle client configured
- Migration scripts added to package.json

### 3. Vercel AI SDK + Gemini
- Image generation service ([lib/ai/image-generation.ts](lib/ai/image-generation.ts))
- AI agents for style and prompt creation ([lib/ai/agents.ts](lib/ai/agents.ts))
- Local file storage utility ([lib/storage/local-storage.ts](lib/storage/local-storage.ts))

### 4. UI Components (shadcn/ui)
- Base components installed:
  - Button, Card, Input, Label
  - Select, Textarea, Badge
  - Dialog, Dropdown Menu, Tabs
- Custom Navigation component
- Home dashboard page with feature cards

## Next Steps

### Before You Can Run the App

1. **Set up PostgreSQL database**
   - Install PostgreSQL locally or use a service like:
     - Vercel Postgres
     - Supabase
     - Railway
     - Local PostgreSQL

2. **Configure environment variables**
   - Copy `.env.example` to `.env.local`
   - Update `DATABASE_URL` with your PostgreSQL connection string
   - Add your `GEMINI_API_KEY`

3. **Initialize the database**
   ```bash
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Quick PostgreSQL Setup (Local)

**Windows:**
```powershell
# Install via Chocolatey
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-14

# Create database
psql -U postgres -c "CREATE DATABASE imagegen;"
```

**Connection string format:**
```
postgresql://postgres:password@localhost:5432/imagegen
```

### Quick PostgreSQL Setup (Cloud - Vercel)

1. Go to https://vercel.com/dashboard
2. Navigate to Storage → Postgres → Create Database
3. Copy the connection string
4. Paste into `.env.local` as `DATABASE_URL`

## File Structure Created

```
image-gen-web/
├── app/
│   ├── layout.tsx              ✅ Main layout with navigation
│   ├── page.tsx                ✅ Home dashboard
│   └── globals.css             ✅ Tailwind styles
├── components/
│   ├── ui/                     ✅ shadcn components
│   └── navigation.tsx          ✅ Main navigation
├── lib/
│   ├── db/
│   │   ├── schema.ts           ✅ Complete database schema
│   │   └── index.ts            ✅ Drizzle client
│   ├── ai/
│   │   ├── image-generation.ts ✅ Image gen service
│   │   └── agents.ts           ✅ AI agents
│   ├── storage/
│   │   └── local-storage.ts    ✅ File storage
│   └── utils.ts                ✅ Helper utilities
├── .env.local                  ✅ Environment variables (add your keys!)
├── .env.example                ✅ Example env file
├── drizzle.config.ts           ✅ Drizzle configuration
├── package.json                ✅ With db scripts
└── README.md                   ✅ Documentation
```

## Available npm Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database scripts
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Run migrations (prod)
npm run db:studio    # Open Drizzle Studio (GUI)
```

## What's Configured

### Environment Variables
- ✅ DATABASE_URL (needs your value)
- ✅ GEMINI_API_KEY (needs your value)
- ✅ NEXT_PUBLIC_APP_URL
- ✅ OUTPUT_DIR

### Database Features
- ✅ Full schema with relations
- ✅ Type-safe queries via Drizzle
- ✅ Migration support
- ✅ Indexes for performance

### AI Features
- ✅ Image generation via Gemini
- ✅ Batch execution logic
- ✅ Style creator agent
- ✅ Prompt generator agent
- ✅ Prompt variation suggester

### Storage
- ✅ Local filesystem storage
- ✅ Organized output directories
- ✅ Image metadata tracking

## Ready for Phase 2!

Once you have:
1. ✅ PostgreSQL running
2. ✅ Environment variables set
3. ✅ Database initialized (`npm run db:push`)

You'll be ready to implement Phase 2 (Core Features):
- Batch listing and creation UI
- Prompt editor component
- Gallery view
- Batch execution with progress tracking

Let me know when you're ready to proceed!
