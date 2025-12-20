export const QUEUE_CONFIG = {
  queues: {
    imageGeneration: 'image-generation',
  },

  jobOptions: {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    expireInHours: 24,
  },
};
