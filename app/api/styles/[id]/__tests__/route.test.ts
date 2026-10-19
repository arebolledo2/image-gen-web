import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, body }),
  },
}));

vi.mock('@/lib/services', () => ({
  stylesService: {
    getStyleWithLineage: vi.fn(),
    updateStyle: vi.fn(),
    delete: vi.fn(),
  },
}));

import { stylesService } from '@/lib/services';
import { DELETE, GET, PATCH } from '../route';

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (body: unknown) => new Request('http://localhost/api/styles/style-1', {
  method: 'PATCH',
  body: JSON.stringify(body),
}) as never;

describe('/api/styles/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET', () => {
    it('returns the style with its lineage', async () => {
      vi.mocked(stylesService.getStyleWithLineage).mockResolvedValue({ id: 'style-1', name: 'Pixel Art' } as never);

      const response = (await GET({} as never, context('style-1'))) as unknown as { status: number; body: unknown };

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ style: { id: 'style-1', name: 'Pixel Art' } });
    });

    it('returns 404 for an unknown style', async () => {
      vi.mocked(stylesService.getStyleWithLineage).mockResolvedValue(undefined);

      const response = (await GET({} as never, context('missing'))) as unknown as { status: number; body: unknown };

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Style not found' });
    });
  });

  describe('PATCH', () => {
    it('passes validated fields to the service', async () => {
      vi.mocked(stylesService.updateStyle).mockResolvedValue({ id: 'style-1', name: 'New' } as never);

      const response = (await PATCH(jsonRequest({ name: 'New' }), context('style-1'))) as unknown as { status: number };

      expect(response.status).toBe(200);
      expect(stylesService.updateStyle).toHaveBeenCalledWith('style-1', { name: 'New' });
    });

    it('rejects an incomplete palette with 400 and does not call the service', async () => {
      const response = (await PATCH(jsonRequest({ palette: { primary: [] } }), context('style-1'))) as unknown as {
        status: number;
      };

      expect(response.status).toBe(400);
      expect(stylesService.updateStyle).not.toHaveBeenCalled();
    });

    it('returns 404 when the style does not exist', async () => {
      vi.mocked(stylesService.updateStyle).mockResolvedValue(undefined);

      const response = (await PATCH(jsonRequest({ name: 'x' }), context('missing'))) as unknown as { status: number };

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes the style version', async () => {
      const response = (await DELETE({} as never, context('style-1'))) as unknown as { status: number; body: unknown };

      expect(stylesService.delete).toHaveBeenCalledWith('style-1');
      expect(response.body).toEqual({ success: true });
    });

    it('reports a 500 without leaking internals when the service fails', async () => {
      vi.mocked(stylesService.delete).mockRejectedValue(new Error('fk violation'));

      const response = (await DELETE({} as never, context('style-1'))) as unknown as { status: number; body: unknown };

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({ error: 'Failed to delete style' });
    });
  });
});
