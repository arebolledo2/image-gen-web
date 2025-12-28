import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue/client';
import { imageGenerationFunction } from '@/lib/queue/functions';
import { audioGenerationFunction } from '@/lib/queue/audio-functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    imageGenerationFunction,
    audioGenerationFunction,
  ],
});
