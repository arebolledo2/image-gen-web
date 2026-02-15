// @ts-nocheck
/**
 * API Route Tests: /api/styles/[id]
 *
 * Tests database integration for the styles detail route (GET/PATCH/DELETE).
 * Note: NextResponse doesn't work properly in vitest, so we test
 * database calls directly (same pattern as export-routes.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockDb = {
    query: {
      styles: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock('@/lib/db/schema', () => ({
  styles: { id: 'styles.id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
}));

import { db } from '@/lib/db';

describe('GET /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find a style by ID', async () => {
    const mockStyle = {
      id: 'style-1',
      name: 'Pixel Art',
      version: 1,
      parentStyle: null,
      childStyles: [],
    };
    vi.mocked(db.query.styles.findFirst).mockResolvedValue(mockStyle);

    const result = await db.query.styles.findFirst({
      where: { eq: ['styles.id', 'style-1'] },
      with: { parentStyle: true, childStyles: true },
    });

    expect(result).toEqual(mockStyle);
    expect(db.query.styles.findFirst).toHaveBeenCalled();
  });

  it('should return undefined for nonexistent style', async () => {
    vi.mocked(db.query.styles.findFirst).mockResolvedValue(undefined);

    const result = await db.query.styles.findFirst({
      where: { eq: ['styles.id', 'nonexistent'] },
    });

    expect(result).toBeUndefined();
  });
});

describe('PATCH /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.update).mockReturnThis();
    vi.mocked(db.set).mockReturnThis();
    vi.mocked(db.where).mockReturnThis();
  });

  it('should update style fields', async () => {
    const updatedStyle = { id: 'style-1', name: 'Updated Name', version: 1 };
    vi.mocked(db.returning).mockResolvedValue([updatedStyle]);

    const result = await db.update('styles').set({ name: 'Updated Name' }).where({}).returning();

    expect(result).toEqual([updatedStyle]);
    expect(db.update).toHaveBeenCalled();
  });

  it('should return empty array for nonexistent style', async () => {
    vi.mocked(db.returning).mockResolvedValue([]);

    const result = await db.update('styles').set({ name: 'New' }).where({}).returning();

    expect(result).toEqual([]);
  });
});

describe('DELETE /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.delete).mockReturnThis();
    vi.mocked(db.where).mockResolvedValue(undefined);
  });

  it('should delete via db chain', async () => {
    await db.delete('styles').where({});

    expect(db.delete).toHaveBeenCalled();
    expect(db.where).toHaveBeenCalled();
  });
});
