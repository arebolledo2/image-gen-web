import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));

vi.mock('@/lib/services', () => ({
  imagesService: {
    getImageWithProvenance: vi.fn(),
  },
}));

import { imagesService } from '@/lib/services';
import { GET } from '../route';

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/images/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns style, subject, and guidance metadata when prompt exists', async () => {
    vi.mocked(imagesService.getImageWithProvenance).mockResolvedValue({
      id: 'img-1',
      filePath: '/tmp/a.png',
      fileName: 'a.png',
      mediaType: 'image/png',
      isFavorite: false,
      transparentFilePath: null,
      flippedFilePath: null,
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
      generation: {
        batch: { id: 'batch-1', name: 'Batch One' },
        batchPrompt: {
          id: 'bp-1',
          promptText: 'prompt text',
          prompt: {
            style: { id: 'style-1', name: 'Pixel' },
            subject: { id: 'subject-1', name: 'Turret' },
            promptGuidance: [
              { guidance: { id: 'guide-1', name: 'High contrast' } },
              { guidance: { id: 'guide-2', name: 'Top-down view' } },
            ],
          },
        },
      },
    } as any);

    const response = await GET({} as any, makeParams('img-1'));
    expect(response.status).toBe(200);
    expect((response as any).body.generation.batchPrompt.prompt).toEqual({
      style: { id: 'style-1', name: 'Pixel' },
      subject: { id: 'subject-1', name: 'Turret' },
      guidance: [
        { id: 'guide-1', name: 'High contrast' },
        { id: 'guide-2', name: 'Top-down view' },
      ],
    });
  });

  it('returns an empty guidance array when prompt has no guidance', async () => {
    vi.mocked(imagesService.getImageWithProvenance).mockResolvedValue({
      id: 'img-2',
      filePath: '/tmp/b.png',
      fileName: 'b.png',
      mediaType: 'image/png',
      isFavorite: false,
      transparentFilePath: null,
      flippedFilePath: null,
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
      generation: {
        batch: { id: 'batch-2', name: 'Batch Two' },
        batchPrompt: {
          id: 'bp-2',
          promptText: 'prompt text',
          prompt: {
            style: { id: 'style-2', name: 'Neo' },
            subject: { id: 'subject-2', name: 'Drone' },
            promptGuidance: [],
          },
        },
      },
    } as any);

    const response = await GET({} as any, makeParams('img-2'));
    expect(response.status).toBe(200);
    expect((response as any).body.generation.batchPrompt.prompt.guidance).toEqual([]);
  });

  it('returns prompt as null for ad-hoc batch prompts', async () => {
    vi.mocked(imagesService.getImageWithProvenance).mockResolvedValue({
      id: 'img-3',
      filePath: '/tmp/c.png',
      fileName: 'c.png',
      mediaType: 'image/png',
      isFavorite: false,
      transparentFilePath: null,
      flippedFilePath: null,
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
      generation: {
        batch: { id: 'batch-3', name: 'Batch Three' },
        batchPrompt: {
          id: 'bp-3',
          promptText: 'ad-hoc prompt',
          prompt: null,
        },
      },
    } as any);

    const response = await GET({} as any, makeParams('img-3'));
    expect(response.status).toBe(200);
    expect((response as any).body.generation.batchPrompt.prompt).toBeNull();
  });

  it('returns 404 when image is not found', async () => {
    vi.mocked(imagesService.getImageWithProvenance).mockResolvedValue(undefined);

    const response = await GET({} as any, makeParams('missing'));
    expect(response.status).toBe(404);
    expect((response as any).body).toEqual({ error: 'Image not found' });
  });

  it('returns 500 when database query throws', async () => {
    vi.mocked(imagesService.getImageWithProvenance).mockRejectedValue(new Error('db down'));

    const response = await GET({} as any, makeParams('img-4'));
    expect(response.status).toBe(500);
    expect((response as any).body).toEqual({ error: 'Failed to fetch image', details: 'db down' });
  });
});
