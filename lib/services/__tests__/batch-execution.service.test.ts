// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchExecutionService } from '../batch-execution.service';
import { queueBatchExecution } from '@/lib/queue/batch-queue';

const findFirst = vi.fn();
const setStatus = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    query: { batches: { findFirst: (...args) => findFirst(...args) } },
  },
}));
vi.mock('@/lib/db/schema', () => ({
  batches: { id: 'id' },
  generations: {},
}));
vi.mock('@/lib/queue/batch-queue', () => ({ queueBatchExecution: vi.fn() }));

describe('BatchExecutionService.executeBatch', () => {
  let service: BatchExecutionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchExecutionService();
    service.updateBatchStatus = setStatus;
  });

  it('throws a 404 when the batch does not exist', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(service.executeBatch('missing')).rejects.toMatchObject({ status: 404 });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('marks the batch queued and returns the job count', async () => {
    findFirst.mockResolvedValue({ id: 'b1', batchPrompts: [] });
    queueBatchExecution.mockResolvedValue({ jobsQueued: 3 });

    await expect(service.executeBatch('b1')).resolves.toEqual({ jobsQueued: 3 });
    expect(setStatus).toHaveBeenCalledWith('b1', 'queued');
  });

  it('marks the batch failed (not stuck queued) when enqueueing throws', async () => {
    findFirst.mockResolvedValue({ id: 'b1', batchPrompts: [] });
    queueBatchExecution.mockRejectedValue(new Error('inngest down'));

    await expect(service.executeBatch('b1')).rejects.toThrow('inngest down');
    expect(setStatus).toHaveBeenNthCalledWith(1, 'b1', 'queued');
    expect(setStatus).toHaveBeenNthCalledWith(2, 'b1', 'failed');
  });
});
