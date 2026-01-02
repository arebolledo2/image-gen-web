/**
 * Test utilities for service layer tests
 */
import { vi } from 'vitest';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

/**
 * Creates a mock database transaction for testing
 */
export function createMockTransaction() {
  const tx = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    query: {
      styles: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      subjects: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      guidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      prompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      promptGuidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      batches: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      batchPrompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      generations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      images: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      squishAnimations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      imageEdits: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };

  return tx as unknown as PgTransaction<PostgresJsQueryResultHKT, Record<string, never>>;
}

/**
 * Creates a test style object
 */
export function createTestStyle(overrides = {}) {
  return {
    id: 'style-test-id',
    name: 'Test Style',
    description: 'A test style',
    version: 1,
    parentStyleId: null,
    palette: {
      primary: ['#FF0000'],
      secondary: ['#00FF00'],
      accent: ['#0000FF'],
    },
    renderingCues: {
      materials: ['Metal'],
      lighting: ['Neon'],
      mood: ['Cyberpunk'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test subject object
 */
export function createTestSubject(overrides = {}) {
  return {
    id: 'subject-test-id',
    name: 'Test Subject',
    description: 'A test subject',
    version: 1,
    parentSubjectId: null,
    isTransparent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test guidance object
 */
export function createTestGuidance(overrides = {}) {
  return {
    id: 'guidance-test-id',
    name: 'Test Guidance',
    description: 'Test guidance modifier',
    version: 1,
    parentGuidanceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test prompt object
 */
export function createTestPrompt(overrides = {}) {
  return {
    id: 'prompt-test-id',
    name: 'Test Prompt',
    styleId: 'style-test-id',
    subjectId: 'subject-test-id',
    promptText: 'A cyberpunk samurai in neon city',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test batch object
 */
export function createTestBatch(overrides = {}) {
  return {
    id: 'batch-test-id',
    name: 'Test Batch',
    description: 'A test batch',
    provider: 'gemini' as const,
    status: 'pending' as const,
    version: 1,
    parentBatchId: null,
    defaults: {
      count: 1,
      resolution: '1024x1024',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test generation object
 */
export function createTestGeneration(overrides = {}) {
  return {
    id: 'generation-test-id',
    batchId: 'batch-test-id',
    batchPromptId: 'batch-prompt-test-id',
    runNumber: 1,
    status: 'pending' as const,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test image object
 */
export function createTestImage(overrides = {}) {
  return {
    id: 'image-test-id',
    generationId: 'generation-test-id',
    fileName: 'test-image.png',
    filePath: '/test/path/test-image.png',
    mimeType: 'image/png',
    fileSize: 1024,
    width: 1024,
    height: 1024,
    isFavorite: false,
    sourceVersion: 'original' as const,
    parentImageId: null,
    transparentFilePath: null,
    flippedFilePath: null,
    squishAnimations: [],
    imageEdits: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock the database module for testing
 */
export function mockDatabase() {
  const db = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      styles: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      subjects: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      guidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      prompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      promptGuidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      batches: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      batchPrompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      generations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      images: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };

  return db;
}
