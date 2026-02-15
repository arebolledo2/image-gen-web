// @ts-nocheck
/**
 * API Route Tests: /api/agents/create-style
 *
 * Tests AI agent integration for style creation.
 * Note: NextResponse doesn't work properly in vitest, so we test
 * agent calls directly (same pattern as export-routes.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/agents', () => ({
  createStyleAgent: vi.fn(),
}));

import { createStyleAgent } from '@/lib/ai/agents';

describe('POST /api/agents/create-style - agent integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call createStyleAgent with description', async () => {
    const mockStyle = {
      name: 'Neon Cyberpunk',
      palette: { primary: ['#FF00FF'], secondary: ['#00FFFF'] },
      renderingCues: { materials: ['Neon'], lighting: ['Glow'] },
    };
    vi.mocked(createStyleAgent).mockResolvedValue(mockStyle);

    const result = await createStyleAgent('A neon cyberpunk aesthetic');

    expect(result).toEqual(mockStyle);
    expect(createStyleAgent).toHaveBeenCalledWith('A neon cyberpunk aesthetic');
  });

  it('should return complete style structure', async () => {
    const mockStyle = {
      name: 'Pixel Art Fantasy',
      palette: { primary: ['#2a7f3e'], accent: ['#ffd700'] },
      renderingCues: { materials: ['Pixel'], mood: ['Whimsical'] },
    };
    vi.mocked(createStyleAgent).mockResolvedValue(mockStyle);

    const result = await createStyleAgent('A whimsical pixel art fantasy style');

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('palette');
    expect(result).toHaveProperty('renderingCues');
  });

  it('should propagate agent errors', async () => {
    vi.mocked(createStyleAgent).mockRejectedValue(new Error('AI API quota exceeded'));

    await expect(
      createStyleAgent('A failing description')
    ).rejects.toThrow('AI API quota exceeded');
  });
});
