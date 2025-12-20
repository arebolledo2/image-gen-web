import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue/client';
import { imageGenerationFunction } from '@/lib/queue/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    imageGenerationFunction,
  ],
});
