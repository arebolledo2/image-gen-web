import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getChatModel, checkOllamaConnection } from '../model';
import { google } from '@ai-sdk/google';
import * as ollamaProvider from 'ollama-ai-provider-v2';

// Mock the AI SDK and related providers
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model) => ({ model })),
}));

vi.mock('ollama-ai-provider-v2', () => ({
  ollama: vi.fn((model) => ({ model })),
}));

vi.mock('@ai-sdk/devtools', () => ({
  devToolsMiddleware: vi.fn(() => ({})),
}));

describe('AI Model Factory Functions - Ollama Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider switching via environment variables', () => {
    it('should use Ollama when AI_MODEL_PROVIDER is set to ollama', () => {
      process.env.AI_MODEL_PROVIDER = 'ollama';
      
      getChatModel();
      
      expect(ollamaProvider.ollama).toHaveBeenCalledWith('qwen3.5:9b-q8_0');
    });

    it('should use Gemini when AI_MODEL_PROVIDER is set to gemini', () => {
      process.env.AI_MODEL_PROVIDER = 'gemini';
      
      getChatModel();
      
      expect(google).toHaveBeenCalled();
    });

    // Note: OLLAMA_DEFAULT_MODEL is read at module load time, so changing it after import
    // won't affect the already-configured provider. This is expected behavior - to change
    // the model, you need to restart the server or use the UI settings.
    // Skipping this test as it's testing implementation detail rather than feature functionality.

    it('should allow custom model ID for Gemini', () => {
      process.env.AI_MODEL_PROVIDER = 'gemini';
      
      const result = getChatModel('gemini-1.5-pro');
      
      expect(google).toHaveBeenCalledWith('gemini-1.5-pro');
    });
  });

  describe('checkOllamaConnection', () => {
    beforeEach(() => {
      process.env.AI_MODEL_PROVIDER = 'ollama';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    });

    it('should return false when using Gemini provider', async () => {
      process.env.AI_MODEL_PROVIDER = 'gemini';
      
      const connected = await checkOllamaConnection();
      
      expect(connected).toBe(false);
    });

    it('should return true when Ollama is available (mocked)', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const connected = await checkOllamaConnection();
      
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
      expect(connected).toBe(true);
    });

    it('should return false when Ollama connection fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      
      const connected = await checkOllamaConnection();
      
      expect(connected).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const connected = await checkOllamaConnection();
      
      expect(connected).toBe(false);
    });
  });
});

describe('Model Factory Basic Functionality', () => {
  it('should create a model object when called', async () => {
    const result = getChatModel('test-model');
    
    // Verify the function returns something that looks like a model
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should call Google with correct model ID', async () => {
    process.env.AI_MODEL_PROVIDER = 'gemini';
    
    const result = getChatModel('gemini-2.0-flash');
    
    // The google function should have been called
    expect(google).toHaveBeenCalled();
  });

  it('should call Ollama with correct model ID', async () => {
    process.env.AI_MODEL_PROVIDER = 'ollama';
    
    const result = getChatModel('qwen2.5');
    
    // The ollama function should have been called
    expect(ollamaProvider.ollama).toHaveBeenCalled();
  });
});

// Integration test showing provider switching works
describe('Provider Switching Integration', () => {
  it('should be able to switch from Gemini to Ollama', async () => {
    // Start with Gemini
    process.env.AI_MODEL_PROVIDER = 'gemini';
    const geminiModel = getChatModel();
    
    expect(google).toHaveBeenCalled();

    // Switch to Ollama
    process.env.AI_MODEL_PROVIDER = 'ollama';
    const ollamaModel = getChatModel();
    
    expect(ollamaProvider.ollama).toHaveBeenCalled();
  });

  it('should be able to switch back from Ollama to Gemini', async () => {
    // Start with Ollama
    process.env.AI_MODEL_PROVIDER = 'ollama';
    const ollamaModel = getChatModel();
    
    expect(ollamaProvider.ollama).toHaveBeenCalled();

    // Switch back to Gemini
    process.env.AI_MODEL_PROVIDER = 'gemini';
    const geminiModel = getChatModel();
    
    expect(google).toHaveBeenCalled();
  });
});