/**
 * ComfyUI Workflow Builder
 * Note: Uses `any` for dynamic ComfyUI workflow JSON structures.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getComfyUIConfig } from './config';

export async function loadWorkflowTemplate(templatePath: string): Promise<any> {
  const content = await readFile(templatePath, 'utf-8');
  return JSON.parse(content);
}

export async function loadParameterMap(mapPath: string): Promise<any> {
  const content = await readFile(mapPath, 'utf-8');
  return JSON.parse(content);
}

export function applyParametersToWorkflow(
  workflow: any,
  paramMap: any,
  userParams: Record<string, any>
): void {
  for (const [paramName, value] of Object.entries(userParams)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    if (!(paramName in paramMap)) {
      continue;
    }

    const mapping = paramMap[paramName];
    const nodeId = String(mapping.nodeId);
    const field = mapping.inputName || mapping.field;
    const paramType = mapping.type || 'string';

    let typedValue: any = value;
    if (paramType === 'integer') typedValue = parseInt(String(value), 10);
    else if (paramType === 'float') typedValue = parseFloat(String(value));
    else if (paramType === 'boolean') typedValue = Boolean(value);
    else typedValue = String(value);

    if (workflow[nodeId]?.inputs) {
      workflow[nodeId].inputs[field] = typedValue;
    }
  }
}

export async function buildWorkflow(
  workflowType: string,
  userParams: Record<string, any>
): Promise<any> {
  const config = getComfyUIConfig();
  const workflowConfig = config.workflows[workflowType];

  if (!workflowConfig) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }

  const templatePath = join(process.cwd(), workflowConfig.template);
  const paramMapPath = join(process.cwd(), workflowConfig.paramMap);

  const workflow = await loadWorkflowTemplate(templatePath);
  const paramMap = await loadParameterMap(paramMapPath);

  const defaults = config.defaults[workflowType] || {};
  const mergedParams = { ...defaults, ...userParams };

  applyParametersToWorkflow(workflow, paramMap, mergedParams);

  return workflow;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * (2 ** 31 - 1)) + 1;
}
