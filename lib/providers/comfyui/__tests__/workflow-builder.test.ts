import { describe, expect, it } from 'vitest';
import { applyParametersToWorkflow } from '../workflow-builder';

describe('applyParametersToWorkflow', () => {
  it('applies a param to a single mapped node', () => {
    const workflow = { '3': { inputs: { seed: 0 } } };
    const paramMap = { seed: { nodeId: 3, inputName: 'seed', type: 'integer' } };

    applyParametersToWorkflow(workflow, paramMap, { seed: 42 });

    expect(workflow['3'].inputs.seed).toBe(42);
  });

  it('fans a param out to multiple mapped nodes when nodeId is an array', () => {
    const workflow = {
      '8': { inputs: { seed: 0, cfg: 0 } },
      '9': { inputs: { seed: 0, cfg: 0 } },
    };
    const paramMap = {
      seed: { nodeId: [8, 9], inputName: 'seed', type: 'integer' },
      cfg: { nodeId: [8, 9], inputName: 'cfg', type: 'float' },
    };

    applyParametersToWorkflow(workflow, paramMap, { seed: 12345, cfg: 1.5 });

    expect(workflow['8'].inputs.seed).toBe(12345);
    expect(workflow['9'].inputs.seed).toBe(12345);
    expect(workflow['8'].inputs.cfg).toBe(1.5);
    expect(workflow['9'].inputs.cfg).toBe(1.5);
  });

  it('skips params not present in the parameter map', () => {
    const workflow = { '3': { inputs: { seed: 0 } } };
    const paramMap = { seed: { nodeId: 3, inputName: 'seed', type: 'integer' } };

    applyParametersToWorkflow(workflow, paramMap, { unmapped: 'value' });

    expect(workflow['3'].inputs.seed).toBe(0);
  });

  it('skips null, undefined, and empty-string values', () => {
    const workflow = { '3': { inputs: { seed: 7 } } };
    const paramMap = { seed: { nodeId: 3, inputName: 'seed', type: 'integer' } };

    applyParametersToWorkflow(workflow, paramMap, { seed: null });
    applyParametersToWorkflow(workflow, paramMap, { seed: undefined });
    applyParametersToWorkflow(workflow, paramMap, { seed: '' });

    expect(workflow['3'].inputs.seed).toBe(7);
  });
});
