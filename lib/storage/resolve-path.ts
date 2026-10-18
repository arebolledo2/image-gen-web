import path from 'path';

/**
 * Resolve a stored file path (absolute or relative to the project root) to an absolute path.
 */
export function resolveStoragePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
}

/**
 * Convert an absolute path back to the project-relative form stored in the database.
 */
export function toStoredPath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath);
}
