import { pgTable, uuid, text, integer, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const batchStatusEnum = pgEnum('batch_status', ['draft', 'queued', 'running', 'completed', 'failed']);
export const generationStatusEnum = pgEnum('generation_status', ['pending', 'running', 'success', 'failed']);

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

// Prompts table
export const prompts = pgTable('prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  template: text('template').notNull(),
  variables: json('variables').$type<Record<string, {
    type: 'text' | 'select' | 'number';
    required: boolean;
    defaultValue?: string | number;
    options?: string[];
  }>>(),
  styleId: uuid('style_id'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Batches table
export const batches = pgTable('batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: batchStatusEnum('status').default('draft').notNull(),
  defaults: json('defaults').$type<{
    aspectRatio?: string;
    imageSize?: string;
    count?: number;
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const stylesRelations = relations(styles, ({ one, many }) => ({
  parentStyle: one(styles, {
    fields: [styles.parentStyleId],
    references: [styles.id],
  }),
  childStyles: many(styles),
  prompts: many(prompts),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  style: one(styles, {
    fields: [prompts.styleId],
    references: [styles.id],
  }),
  batchPrompts: many(batchPrompts),
}));

export const batchesRelations = relations(batches, ({ many }) => ({
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

export const imagesRelations = relations(images, ({ one }) => ({
  generation: one(generations, {
    fields: [images.generationId],
    references: [generations.id],
  }),
}));

// Type exports
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
export type BatchPrompt = typeof batchPrompts.$inferSelect;
export type NewBatchPrompt = typeof batchPrompts.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
