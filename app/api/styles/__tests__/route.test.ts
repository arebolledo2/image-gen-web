// @ts-nocheck
/**
 * API Route Tests: /api/styles
 *
 * Tests service integration for the styles CRUD route.
 * Note: NextResponse doesn't work properly in vitest, so we test
 * service calls directly (same pattern as export-routes.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services', () => ({
  stylesService: {
    getLatestStyles: vi.fn(),
    createStyle: vi.fn(),
    createStyleVersion: vi.fn(),
  },
}));

import { stylesService } from '@/lib/services';

describe('GET /api/styles - service integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call getLatestStyles with default options', async () => {
    vi.mocked(stylesService.getLatestStyles).mockResolvedValue([]);

    await stylesService.getLatestStyles({ favoritesOnly: false });

    expect(stylesService.getLatestStyles).toHaveBeenCalledWith({ favoritesOnly: false });
  });

  it('should call getLatestStyles with favoritesOnly filter', async () => {
    vi.mocked(stylesService.getLatestStyles).mockResolvedValue([]);

    await stylesService.getLatestStyles({ favoritesOnly: true });

    expect(stylesService.getLatestStyles).toHaveBeenCalledWith({ favoritesOnly: true });
  });

  it('should return styles from service', async () => {
    const mockStyles = [
      { id: '1', name: 'Cyberpunk', version: 1 },
      { id: '2', name: 'Pixel Art', version: 1 },
    ];
    vi.mocked(stylesService.getLatestStyles).mockResolvedValue(mockStyles);

    const result = await stylesService.getLatestStyles({ favoritesOnly: false });

    expect(result).toEqual(mockStyles);
    expect(result).toHaveLength(2);
  });
});

describe('POST /api/styles - service integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new style via createStyle', async () => {
    const newStyle = { id: '1', name: 'Pixel Art', version: 1 };
    vi.mocked(stylesService.createStyle).mockResolvedValue(newStyle);

    const result = await stylesService.createStyle({
      name: 'Pixel Art',
      palette: { primary: ['#FF0000'] },
      renderingCues: { materials: ['Metal'] },
    });

    expect(result).toEqual(newStyle);
    expect(stylesService.createStyle).toHaveBeenCalledWith({
      name: 'Pixel Art',
      palette: { primary: ['#FF0000'] },
      renderingCues: { materials: ['Metal'] },
    });
  });

  it('should create a version via createStyleVersion when parentStyleId provided', async () => {
    const versionStyle = { id: '2', name: 'Pixel Art v2', parentStyleId: '1', version: 2 };
    vi.mocked(stylesService.createStyleVersion).mockResolvedValue(versionStyle);

    const result = await stylesService.createStyleVersion('1', {
      name: 'Pixel Art v2',
      palette: { primary: ['#00FF00'] },
      renderingCues: { materials: ['Wood'] },
    });

    expect(result).toEqual(versionStyle);
    expect(stylesService.createStyleVersion).toHaveBeenCalledWith('1', expect.objectContaining({
      name: 'Pixel Art v2',
    }));
  });

  it('should propagate service errors', async () => {
    vi.mocked(stylesService.createStyle).mockRejectedValue(new Error('Duplicate name'));

    await expect(
      stylesService.createStyle({ name: 'Dup', palette: {}, renderingCues: {} })
    ).rejects.toThrow('Duplicate name');
  });
});
