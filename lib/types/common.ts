/**
 * Common Type Definitions
 *
 * Shared types used across services, queue, and components.
 * These replace explicit `any` types with proper type safety.
 */

import type {
    Batch,
    BatchPrompt,
    AudioBatch,
    AudioBatchPrompt,
    SquishAnimation,
    ImageEdit,
} from '@/lib/db/schema';

// =============================================================================
// Batch Types
// =============================================================================

/**
 * Defaults for image batch generation
 */
export interface BatchDefaults {
    aspectRatio?: string;
    imageSize?: string;
    count?: number;
    resolution?: string;
}

/**
 * Overrides for individual batch prompts
 */
export interface BatchPromptOverrides {
    count?: number;
    aspectRatio?: string;
    imageSize?: string;
    resolution?: string;
}

/**
 * Batch with its prompts loaded (for queue functions)
 */
export interface BatchWithPrompts extends Batch {
    batchPrompts: BatchPrompt[];
}

// =============================================================================
// Audio Batch Types
// =============================================================================

/**
 * Defaults for audio batch generation
 */
export interface AudioBatchDefaults {
    duration?: number;      // seconds (1-30)
    count?: number;         // variations per prompt (1-5)
    temperature?: number;   // 0.5-2.0
    topK?: number;          // 0-250
    cfgCoef?: number;       // classifier-free guidance coefficient
}

/**
 * Overrides for individual audio batch prompts
 */
export interface AudioBatchPromptOverrides {
    duration?: number;
    count?: number;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
}

/**
 * Audio batch with its prompts loaded (for queue functions)
 */
export interface AudioBatchWithPrompts extends AudioBatch {
    audioBatchPrompts: AudioBatchPrompt[];
}

// =============================================================================
// Generation Parameter Types
// =============================================================================

/**
 * Parameters for image generation jobs
 */
export interface ImageGenerationParameters {
    aspectRatio?: string;
    imageSize?: string;
    resolution?: string;
    width?: number;
    height?: number;
    imageConfig?: {
        aspectRatio?: string;
        imageSize?: string;
    };
}

/**
 * Parameters for audio generation jobs
 */
export interface AudioGenerationParameters {
    duration?: number;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
}

// =============================================================================
// Metadata Types
// =============================================================================

/**
 * Metadata for generated images
 */
export interface ImageMetadata {
    width?: number;
    height?: number;
    format?: string;
    model?: string;
    [key: string]: unknown;
}

/**
 * Metadata for generated audio files
 */
export interface AudioFileMetadata {
    prompt?: string;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
    [key: string]: unknown;
}

/**
 * Metadata for squish animations
 */
export interface SquishAnimationMetadata {
    width?: number;
    height?: number;
    frameWidth?: number;
    frameHeight?: number;
    duration?: number;
    gridSize?: number;
    [key: string]: unknown;
}

/**
 * Metadata for image edits
 */
export interface ImageEditMetadata {
    width?: number;
    height?: number;
    sourceFilePath?: string;
    [key: string]: unknown;
}

// =============================================================================
// Batch Status Update Types
// =============================================================================

/**
 * Fields that can be updated when changing batch status
 */
export interface BatchStatusUpdate {
    status: 'draft' | 'queued' | 'running' | 'completed' | 'failed';
    updatedAt: Date;
    completedAt?: Date;
}

// =============================================================================
// Animation Types (for components)
// =============================================================================

/**
 * Animation data structure used in components
 */
export type AnimationType = SquishAnimation;

/**
 * Image edit data structure used in components
 */
export type EditType = ImageEdit;
