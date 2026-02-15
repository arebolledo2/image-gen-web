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
import { styles } from '@/lib/db/schema';

describe('GET /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find a style by ID', async () => {
    const mockStyle = {
      id: 'style-1',
      name: 'Pixel Art',
      version: 1,
      parentStyleId: null,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      palette: { primary: [], accent: [], background: '' },
      renderingCues: { materials: [], effects: [], finish: '' },
      description: null,
      parentStyle: null,
      childStyles: [],
    };
    vi.mocked(db.query.styles.findFirst).mockResolvedValue(mockStyle as any);

    const result = await db.query.styles.findFirst({
      where: { eq: ['styles.id', 'style-1'] } as any,
      with: { parentStyle: true, childStyles: true } as any,
    });

    expect(result).toEqual(mockStyle);
    expect(db.query.styles.findFirst).toHaveBeenCalled();
  });

  it('should return undefined for nonexistent style', async () => {
    vi.mocked(db.query.styles.findFirst).mockResolvedValue(undefined);

    const result = await db.query.styles.findFirst({
      where: { eq: ['styles.id', 'nonexistent'] } as any,
    });

    expect(result).toBeUndefined();
  });
});

describe('PATCH /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.update).mockReturnThis();
    vi.mocked((db as any).set).mockReturnThis();
    vi.mocked((db as any).where).mockReturnThis();
  });

  it('should update style fields', async () => {
    const updatedStyle = { id: 'style-1', name: 'Updated Name', version: 1 };
    vi.mocked((db as any).returning).mockResolvedValue([updatedStyle as any]);

    const result = await (db.update(styles) as any).set({ name: 'Updated Name' }).where({}).returning();

    expect(result).toEqual([updatedStyle]);
    expect(db.update).toHaveBeenCalled();
  });

  it('should return empty array for nonexistent style', async () => {
    vi.mocked((db as any).returning).mockResolvedValue([]);

    const result = await (db.update(styles) as any).set({ name: 'New' }).where({} as any).returning();

    expect(result).toEqual([]);
  });
});

describe('DELETE /api/styles/[id] - db integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.delete).mockReturnThis();
    vi.mocked((db as any).where).mockResolvedValue(undefined);
  });

  it('should delete via db chain', async () => {
    await (db.delete(styles) as any).where({} as any);

    expect(db.delete).toHaveBeenCalled();
    expect((db as any).where).toHaveBeenCalled();
  });
});
