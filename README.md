# Image Gen Web

A powerful web orchestration platform for large-scale image generation, built with Next.js 16, Vercel AI SDK, and Inngest.

## 🚀 Overview

Image Gen Web provides a sophisticated interface for managing the entire lifecycle of AI image generation. It goes beyond simple single-image prompts by offering a structured approach to style management, prompt templating, and batch execution. Whether you are generating assets for a game, marketing materials, or experimental art, this platform provides the tools to do it at scale with precision.

## ✨ Key Features

- **🎨 Style Management**: Define and version complex art styles. Use AI agents to help craft specific visual languages.
- **📝 Prompt Engineering**: Create reusable prompt templates with support for dynamic variables.
- **📦 Batch Orchestration**: Group prompts and styles into batches for bulk generation.
- **🤖 AI Agents**: Built-in agents to assist in:
  - Composing complex prompts from simple ideas.
  - Suggesting variations and style refinements.
  - Generating batch metadata automatically.
- **⚙️ Background Processing**: Reliable execution of generation tasks using Inngest for queue management and retries.
- **🖼️ Gallery & Asset Tracking**: Organize and view generated images with full metadata and parent prompt/style tracking.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **AI Integration**: OpenAI GPT Image 2, OpenRouter GPT-5.4 Image 2, [Vercel AI SDK](https://sdk.vercel.ai/), [OpenAI](https://platform.openai.com/), and [Google Gemini](https://ai.google.dev/)
- **Job Queue**: [Inngest](https://www.inngest.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Testing**: [Vitest](https://vitest.dev/)

## 🏗️ Architecture

The application follows a modern serverless-ready architecture:

1.  **Web UI**: A responsive React interface for managing resources and monitoring progress.
2.  **API Layer**: Next.js Route Handlers managing database operations and triggering background jobs.
3.  **Database**: A relational schema optimized for tracking complex relationships between styles, prompts, batches, and images.
4.  **Queue System**: Inngest handles the asynchronous execution of image generation, ensuring high reliability and observability.

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- OpenAI API key for default GPT Image 2 generation
- OpenRouter API key for OpenRouter GPT-5.4 Image 2 generation
- Gemini or OpenAI API key for AI agent text workflows, depending on selected LLM provider

### Quick Start

1.  **Clone and Install**:
    ```bash
    cd image-gen-web
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env.local` and fill in your credentials:
    ```bash
    DATABASE_URL="postgresql://..."
    OPENAI_API_KEY="your_openai_api_key"
    GEMINI_API_KEY="your_gemini_api_key"
    ```

3.  **Database Initialization**:
    ```bash
    npm run db:push
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    This starts the Next.js app, the Inngest dev server, and the optional `audio-gen` Python server.
    If you don't have `audio-gen` (it lives outside this repo), run `npm run dev:core` instead to start only
    Next.js and Inngest. Audio features will be unavailable.

## 📚 Documentation

Comprehensive documentation lives in [`doc/`](./doc/index.md):

| Document | Description |
|----------|-------------|
| [index.md](./doc/index.md) | Overview, quick reference, navigation |
| [architecture.md](./doc/architecture.md) | System architecture, tech stack, file structure |
| [database.md](./doc/database.md) | Schema (17 tables, 6 enums), relations, migrations |
| [services.md](./doc/services.md) | Service layer (10 services), transactions, versioning |
| [ai-agents.md](./doc/ai-agents.md) | AI agents, model config, tools, chat agent |
| [api-reference.md](./doc/api-reference.md) | Complete REST API reference (19 route groups) |
| [queue.md](./doc/queue.md) | Inngest job queue, retry config |
| [storage.md](./doc/storage.md) | Image storage, thumbnails, ZIP export |
| [providers.md](./doc/providers.md) | Image & audio generation providers |
| [development.md](./doc/development.md) | Setup, env vars, npm scripts, testing |
| [conventions.md](./doc/conventions.md) | Code patterns, common recipes |

## 📜 Available Scripts

- `npm run dev`: Starts Next.js, Inngest, and audio-gen in development mode.
- `npm run dev:core`: Starts Next.js and Inngest only (no audio-gen).
- `npm run build`: Builds the application for production.
- `npm run db:push`: Syncs the database schema with your Drizzle definitions.
- `npm run db:studio`: Opens a GUI for exploring your database.
- `npm run test`: Runs type checking + linting + test suite.

See [doc/development.md](./doc/development.md) for the full list of 18 npm scripts.

## ⚠️ Scope and limitations

- **Local, single-user tool.** There is no authentication on the `/api/*` routes. Run it on your own machine and do not expose it to the internet.
- **Part of a larger workspace.** It was built alongside a game ([turret-game](https://github.com/arebolledo2/turret-game)) and two companion projects: `image-gen` (Python/ComfyUI scripts) and `audio-gen` (Python audio server). They are not required for the core app, but the default `OUTPUT_DIR` (`../image-gen/outputs`) points at the former, so set `OUTPUT_DIR` to any writable folder.
- **Bring your own keys.** Generation calls the OpenAI, OpenRouter and Gemini APIs and costs real money; ComfyUI is optional and self-hosted.

## 📄 License

[MIT](./LICENSE)
