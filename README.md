# Image Gen Web

AI-powered sprite and asset generator with batch processing, style management, and intelligent agent assistance.

## Features

- **Gallery**: Browse all generated images with filtering and search
- **Batch Processing**: Create and execute multi-prompt generation batches
- **Style Management**: Define, version, and manage art styles
- **Prompt Templates**: Build reusable prompts with variables
- **AI Agents**: Get AI assistance for creating styles, prompts, and suggestions

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Vercel AI SDK + Google Gemini
- **UI**: shadcn/ui + Tailwind CSS
- **Storage**: Local filesystem (development)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Gemini API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your:
- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Your Google Gemini API key

3. Generate and run database migrations:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Project Structure

```
image-gen-web/
├── app/              # Next.js 15 App Router pages
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── gallery/     # Gallery-specific components
│   ├── batches/     # Batch management components
│   ├── styles/      # Style management components
│   └── prompts/     # Prompt management components
├── lib/
│   ├── db/          # Database schema and client
│   ├── ai/          # AI generation and agents
│   └── storage/     # File storage utilities
└── outputs/         # Generated images (gitignored)
```

## Development Phases

- ✅ **Phase 1**: Foundation (Next.js, Drizzle, shadcn/ui, AI SDK)
- ⏳ **Phase 2**: Core Features (batches, prompts, generation)
- ⏳ **Phase 3**: Style & Prompt Management
- ⏳ **Phase 4**: AI Agents
- ⏳ **Phase 5**: Polish & Deploy

## API Differences from Python Scripts

This web app uses `gemini-2.5-flash-image-preview` via Vercel AI SDK instead of the Python scripts' `gemini-3-pro-image-preview`. Key differences:

- Images are returned via `generateText().files` array
- No explicit `aspectRatio`/`imageSize` parameters
- May require prompt adjustments for consistent results

## License

MIT
