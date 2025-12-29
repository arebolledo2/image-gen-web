import { pgTable, uuid, text, integer, timestamp, json, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const batchStatusEnum = pgEnum('batch_status', ['draft', 'queued', 'running', 'completed', 'failed']);
export const generationStatusEnum = pgEnum('generation_status', ['pending', 'running', 'success', 'failed']);
export const providerEnum = pgEnum('provider', ['gemini', 'gemini3', 'comfyui']);
export const audioProviderEnum = pgEnum('audio_provider', ['audiocraft', 'elevenlabs']);
export const animationTypeEnum = pgEnum('animation_type', ['bounce', 'squash_stretch']);
export const animationGeneratorEnum = pgEnum('animation_generator', ['manual', 'ai']);

// Styles table
export const styles = pgTable('styles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  parentStyleId: uuid('parent_style_id'),
  palette: json('palette').$type<{
    primary: string[];
    accent: string[];
    background: string;
  }>().notNull(),
  renderingCues: json('rendering_cues').$type<{
    materials: string[];
    effects: string[];
    finish: string;
  }>().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subjects table (New)
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  parentSubjectId: uuid('parent_subject_id'),
  description: text('description'),
  isTransparent: boolean('is_transparent').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Guidance table (New)
export const guidance = pgTable('guidance', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  parentGuidanceId: uuid('parent_guidance_id'),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Prompts table (Refactored)
export const prompts = pgTable('prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  styleId: uuid('style_id').notNull(),
  subjectId: uuid('subject_id').notNull(),
  promptText: text('prompt_text'), // Cached AI constructed text
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Prompt Guidance (Join table)
export const promptGuidance = pgTable('prompt_guidance', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id').notNull(),
  guidanceId: uuid('guidance_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Batches table
export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  parentBatchId: uuid('parent_batch_id'),
  description: text('description'),
  status: batchStatusEnum('status').default('draft').notNull(),
  provider: providerEnum('provider').default('gemini').notNull(),
  defaults: json('defaults').$type<{
    aspectRatio?: string;
    imageSize?: string;
    count?: number;
    resolution?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Batch prompts (join table)
export const batchPrompts = pgTable('batch_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').notNull(),
  promptId: uuid('prompt_id'), // nullable for ad-hoc prompts
  promptText: text('prompt_text').notNull(), // resolved prompt text
  overrides: json('overrides').$type<{
    count?: number;
    aspectRatio?: string;
    imageSize?: string;
    resolution?: string;
  }>(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Generations table
export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').notNull(),
  batchPromptId: uuid('batch_prompt_id').notNull(),
  status: generationStatusEnum('status').default('pending').notNull(),
  runNumber: integer('run_number').notNull(), // for count > 1
  metadata: json('metadata'), // full API response metadata
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Images table
export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  mediaType: text('media_type').notNull(), // 'image/png', 'image/jpeg'
  fileSize: integer('file_size'),
  metadata: json('metadata').$type<{
    width?: number;
    height?: number;
    [key: string]: any;
  }>(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  transparentFilePath: text('transparent_file_path'),
  flippedFilePath: text('flipped_file_path'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Squish Animations table
export const squishAnimations = pgTable('squish_animations', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').notNull(),
  spritesheetPath: text('spritesheet_path').notNull(),
  frameCount: integer('frame_count').notNull(),
  intensity: integer('intensity').notNull(), // 0-100 percentage
  animationType: animationTypeEnum('animation_type').default('bounce').notNull(),
  generatedBy: animationGeneratorEnum('generated_by').default('manual').notNull(),
  aiPrompt: text('ai_prompt'), // AI generation prompt (null for manual)
  fullAiPrompt: text('full_ai_prompt'), // Full constructed prompt sent to AI
  metadata: json('metadata').$type<{
    width?: number;
    height?: number;
    frameWidth?: number;
    frameHeight?: number;
    duration?: number; // milliseconds per cycle
    gridSize?: number; // 2, 3, or 4 for AI-generated animations
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Image Edits table
export const imageEdits = pgTable('image_edits', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').notNull(),
  sourceVersion: text('source_version').notNull(), // 'original', 'transparent', 'flipped', 'squish-{uuid}', 'ai-{uuid}', 'edit-{uuid}'
  editedFilePath: text('edited_file_path').notNull(),
  transparentEditPath: text('transparent_edit_path'), // nullable transparent version of the edit
  userPrompt: text('user_prompt').notNull(),
  fullAiPrompt: text('full_ai_prompt').notNull(),
  generatedName: text('generated_name').notNull(),
  metadata: json('metadata').$type<{
    width?: number;
    height?: number;
    sourceFilePath?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audio Batches table
export const audioBatches = pgTable('audio_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  parentAudioBatchId: uuid('parent_audio_batch_id'),
  description: text('description'),
  status: batchStatusEnum('status').default('draft').notNull(),
  provider: audioProviderEnum('provider').default('audiocraft').notNull(),
  defaults: json('defaults').$type<{
    duration?: number;      // seconds (1-10)
    count?: number;         // variations per prompt (1-5)
    temperature?: number;   // 0.5-2.0
    topK?: number;          // 0-250
    cfgCoef?: number;       // classifier-free guidance coefficient
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Audio Batch Prompts (join table)
export const audioBatchPrompts = pgTable('audio_batch_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  audioBatchId: uuid('audio_batch_id').notNull(),
  promptText: text('prompt_text').notNull(),
  overrides: json('overrides').$type<{
    duration?: number;
    count?: number;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
  }>(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audio Generations table
export const audioGenerations = pgTable('audio_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  audioBatchId: uuid('audio_batch_id').notNull(),
  audioBatchPromptId: uuid('audio_batch_prompt_id').notNull(),
  status: generationStatusEnum('status').default('pending').notNull(),
  runNumber: integer('run_number').notNull(), // for count > 1
  metadata: json('metadata'), // full API response metadata
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Audio Files table
export const audioFiles = pgTable('audio_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  audioGenerationId: uuid('audio_generation_id').notNull(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  mediaType: text('media_type').notNull(), // 'audio/mpeg', 'audio/wav'
  fileSize: integer('file_size'),
  duration: integer('duration'), // milliseconds
  sampleRate: integer('sample_rate'), // Hz (e.g., 16000)
  metadata: json('metadata').$type<{
    [key: string]: any;
  }>(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const stylesRelations = relations(styles, ({ one, many }) => ({
  parentStyle: one(styles, {
    fields: [styles.parentStyleId],
    references: [styles.id],
    relationName: 'styleLineage',
  }),
  childStyles: many(styles, {
    relationName: 'styleLineage',
  }),
  prompts: many(prompts),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  parentSubject: one(subjects, {
    fields: [subjects.parentSubjectId],
    references: [subjects.id],
    relationName: 'subjectLineage',
  }),
  childSubjects: many(subjects, {
    relationName: 'subjectLineage',
  }),
  prompts: many(prompts),
}));

export const guidanceRelations = relations(guidance, ({ one, many }) => ({
  parentGuidance: one(guidance, {
    fields: [guidance.parentGuidanceId],
    references: [guidance.id],
    relationName: 'guidanceLineage',
  }),
  childGuidances: many(guidance, {
    relationName: 'guidanceLineage',
  }),
  promptGuidance: many(promptGuidance),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  style: one(styles, {
    fields: [prompts.styleId],
    references: [styles.id],
  }),
  subject: one(subjects, {
    fields: [prompts.subjectId],
    references: [subjects.id],
  }),
  promptGuidance: many(promptGuidance),
  batchPrompts: many(batchPrompts),
}));

export const promptGuidanceRelations = relations(promptGuidance, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptGuidance.promptId],
    references: [prompts.id],
  }),
  guidance: one(guidance, {
    fields: [promptGuidance.guidanceId],
    references: [guidance.id],
  }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  parentBatch: one(batches, {
    fields: [batches.parentBatchId],
    references: [batches.id],
    relationName: 'batchLineage',
  }),
  childBatches: many(batches, {
    relationName: 'batchLineage',
  }),
  batchPrompts: many(batchPrompts),
  generations: many(generations),
}));

export const batchPromptsRelations = relations(batchPrompts, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchPrompts.batchId],
    references: [batches.id],
  }),
  prompt: one(prompts, {
    fields: [batchPrompts.promptId],
    references: [prompts.id],
  }),
  generations: many(generations),
}));

export const generationsRelations = relations(generations, ({ one, many }) => ({
  batch: one(batches, {
    fields: [generations.batchId],
    references: [batches.id],
  }),
  batchPrompt: one(batchPrompts, {
    fields: [generations.batchPromptId],
    references: [batchPrompts.id],
  }),
  images: many(images),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  generation: one(generations, {
    fields: [images.generationId],
    references: [generations.id],
  }),
  squishAnimations: many(squishAnimations),
  imageEdits: many(imageEdits),
}));

export const squishAnimationsRelations = relations(squishAnimations, ({ one }) => ({
  image: one(images, {
    fields: [squishAnimations.imageId],
    references: [images.id],
  }),
}));

export const imageEditsRelations = relations(imageEdits, ({ one }) => ({
  image: one(images, {
    fields: [imageEdits.imageId],
    references: [images.id],
  }),
}));

export const audioBatchesRelations = relations(audioBatches, ({ one, many }) => ({
  parentAudioBatch: one(audioBatches, {
    fields: [audioBatches.parentAudioBatchId],
    references: [audioBatches.id],
    relationName: 'audioBatchLineage',
  }),
  childAudioBatches: many(audioBatches, {
    relationName: 'audioBatchLineage',
  }),
  audioBatchPrompts: many(audioBatchPrompts),
  audioGenerations: many(audioGenerations),
}));

export const audioBatchPromptsRelations = relations(audioBatchPrompts, ({ one, many }) => ({
  audioBatch: one(audioBatches, {
    fields: [audioBatchPrompts.audioBatchId],
    references: [audioBatches.id],
  }),
  audioGenerations: many(audioGenerations),
}));

export const audioGenerationsRelations = relations(audioGenerations, ({ one, many }) => ({
  audioBatch: one(audioBatches, {
    fields: [audioGenerations.audioBatchId],
    references: [audioBatches.id],
  }),
  audioBatchPrompt: one(audioBatchPrompts, {
    fields: [audioGenerations.audioBatchPromptId],
    references: [audioBatchPrompts.id],
  }),
  audioFiles: many(audioFiles),
}));

export const audioFilesRelations = relations(audioFiles, ({ one }) => ({
  audioGeneration: one(audioGenerations, {
    fields: [audioFiles.audioGenerationId],
    references: [audioGenerations.id],
  }),
}));

// Type exports
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Guidance = typeof guidance.$inferSelect;
export type NewGuidance = typeof guidance.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type PromptGuidance = typeof promptGuidance.$inferSelect;
export type NewPromptGuidance = typeof promptGuidance.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type BatchPrompt = typeof batchPrompts.$inferSelect;
export type NewBatchPrompt = typeof batchPrompts.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type SquishAnimation = typeof squishAnimations.$inferSelect;
export type NewSquishAnimation = typeof squishAnimations.$inferInsert;
export type ImageEdit = typeof imageEdits.$inferSelect;
export type NewImageEdit = typeof imageEdits.$inferInsert;
export type AudioBatch = typeof audioBatches.$inferSelect;
export type NewAudioBatch = typeof audioBatches.$inferInsert;
export type AudioBatchPrompt = typeof audioBatchPrompts.$inferSelect;
export type NewAudioBatchPrompt = typeof audioBatchPrompts.$inferInsert;
export type AudioGeneration = typeof audioGenerations.$inferSelect;
export type NewAudioGeneration = typeof audioGenerations.$inferInsert;
export type AudioFile = typeof audioFiles.$inferSelect;
export type NewAudioFile = typeof audioFiles.$inferInsert;
