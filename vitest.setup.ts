import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.GOOGLE_API_KEY = 'test-api-key';
process.env.OUTPUT_DIR = './test-outputs';

// Mock Next.js server-only modules
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, init) => ({ data, ...init })),
  },
}));
