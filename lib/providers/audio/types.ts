/**
 * Audio Provider Interfaces
 *
 * Defines the contract for audio generation providers.
 * All audio providers must implement the AudioProvider interface.
 */

/**
 * Options for audio generation
 */
export interface AudioGenerationOptions {
  prompt: string;
  duration?: number;      // Duration in seconds (1-10)
  temperature?: number;   // Sampling temperature (0.5-2.0)
  topK?: number;          // Top-k sampling (0-250)
  cfgCoef?: number;       // Classifier-free guidance coefficient (1.0-10.0)
}

/**
 * Result from audio generation
 */
export interface AudioGenerationResult {
  filePath: string;       // Path to the generated audio file
  fileName: string;       // Name of the audio file
  duration: number;       // Duration in milliseconds
  sampleRate: number;     // Sample rate in Hz (e.g., 16000)
  fileSize: number;       // File size in bytes
  mediaType: string;      // MIME type (e.g., 'audio/wav')
  metadata?: Record<string, any>; // Additional metadata from provider
}

/**
 * Audio Provider Interface
 *
 * All audio generation providers must implement this interface.
 */
export interface AudioProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Test connection to the audio service
   *
   * @returns true if connection is successful
   * @throws Error if connection fails
   */
  testConnection(): Promise<boolean>;

  /**
   * Generate audio from a prompt
   *
   * @param options - Audio generation options
   * @param generationId - Database generation record ID
   * @returns Generation result with file information
   * @throws Error if generation fails
   */
  generateAudio(
    options: AudioGenerationOptions,
    generationId: string
  ): Promise<AudioGenerationResult>;
}

/**
 * Audio provider type
 */
export type AudioProviderType = 'audiocraft';
