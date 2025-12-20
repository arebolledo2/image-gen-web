import { getQueueClient } from '../lib/queue/client';
import { registerImageGenerationWorker } from '../lib/queue/workers/image-generation-worker';

async function main() {
  console.log('Starting job queue workers...');

  const boss = await getQueueClient();

  registerImageGenerationWorker(boss);

  console.log('Workers registered and running.');
  console.log('Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nStopping workers...');
    await boss.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start workers:', error);
  process.exit(1);
});
