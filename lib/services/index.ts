/**
 * Service Layer
 *
 * This module provides a centralized service layer for all database operations.
 * Services encapsulate business logic and provide transaction support.
 *
 * Benefits:
 * - Reusable business logic across API routes
 * - Transaction support for multi-step operations
 * - Easier to test in isolation
 * - Consistent data access patterns
 * - Better separation of concerns
 *
 * @example
 * ```typescript
 * import { stylesService } from '@/lib/services';
 *
 * const style = await stylesService.createStyle({
 *   name: 'Cyberpunk',
 *   palette: { ... },
 *   renderingCues: { ... }
 * });
 * ```
 */

export { BaseService } from './base.service';
export { stylesService, StylesService } from './styles.service';
export { subjectsService, SubjectsService } from './subjects.service';
export { guidanceService, GuidanceService } from './guidance.service';
export { promptsService, PromptsService } from './prompts.service';
export { batchesService, BatchesService } from './batches.service';
export { imagesService, ImagesService } from './images.service';
