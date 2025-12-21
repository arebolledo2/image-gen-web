# Image Gen Web

A powerful web orchestration platform for large-scale image generation, built with Next.js 15, Vercel AI SDK, and Inngest.

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

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) & [Google Gemini](https://ai.google.dev/)
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
- Gemini API Key

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
    GEMINI_API_KEY="your_api_key"
    ```

3.  **Database Initialization**:
    ```bash
    npm run db:push
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    This starts both the Next.js app and the Inngest dev server.

> For more detailed setup instructions, including local PostgreSQL configuration, see the [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## 📜 Available Scripts

- `npm run dev`: Starts Next.js and Inngest in development mode.
- `npm run build`: Builds the application for production.
- `npm run db:push`: Syncs the database schema with your Drizzle definitions.
- `npm run db:studio`: Opens a GUI for exploring your database.
- `npm run test`: Executes the test suite using Vitest.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and intended for internal use.
