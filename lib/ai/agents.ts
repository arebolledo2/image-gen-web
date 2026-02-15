/**
 * AI Agents - Re-export barrel file
 *
 * Agent implementations are split by domain:
 * - agents/style-agents.ts   — createStyleAgent, editStyleAgent
 * - agents/prompt-agents.ts  — createPromptAgent, suggestPromptVariations, composeConstructedPromptAgent, adjustPromptAgent
 * - agents/batch-agents.ts   — createBatchMetadataAgent
 * - agents/subject-agents.ts — createSubjectAgent
 * - agents/audio-agents.ts   — createAudioPromptAgent
 */
export {
  // Style
  createStyleAgent,
  editStyleAgent,
  styleSchema,
  // Prompt
  createPromptAgent,
  suggestPromptVariations,
  composeConstructedPromptAgent,
  adjustPromptAgent,
  // Batch
  createBatchMetadataAgent,
  // Subject
  createSubjectAgent,
  // Audio
  createAudioPromptAgent,
} from './agents/index';

export type {
  StyleSuggestion,
  EditStyleParams,
  PromptSuggestion,
  CreatePromptAgentParams,
  ComposePromptParams,
  BatchMetadataSuggestion,
  SubjectSuggestion,
  AudioPromptSuggestion,
} from './agents/index';
