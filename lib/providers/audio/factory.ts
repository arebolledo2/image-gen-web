import { AudioProvider, AudioProviderType } from './types';
import { AudioCraftProvider } from './audiocraft-provider';

/**
 * Audio Provider Factory
 *
 * Returns the appropriate audio provider instance based on the provider type.
 * Currently supports AudioCraft.
 */

// Singleton instances
const providers: Map<AudioProviderType, AudioProvider> = new Map();

/**
 * Get an audio provider instance
 *
 * @param providerType - Type of audio provider to get
 * @returns Audio provider instance
 * @throws Error if provider type is not supported
 */
export function getAudioProvider(providerType: AudioProviderType = 'audiocraft'): AudioProvider {
  // Return cached instance if available
  if (providers.has(providerType)) {
    return providers.get(providerType)!;
  }

  // Create new instance based on type
  let provider: AudioProvider;

  switch (providerType) {
    case 'audiocraft':
      provider = new AudioCraftProvider();
      break;
    default:
      throw new Error(`Unsupported audio provider type: ${providerType}`);
  }

  // Cache the instance
  providers.set(providerType, provider);

  return provider;
}

/**
 * Test connection to an audio provider
 *
 * @param providerType - Type of audio provider to test
 * @returns true if connection is successful
 * @throws Error if connection fails
 */
export async function testAudioProvider(providerType: AudioProviderType = 'audiocraft'): Promise<boolean> {
  const provider = getAudioProvider(providerType);
  return provider.testConnection();
}
