import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility for conditionally joining Tailwind CSS class names.
 * Combines clsx and tailwind-merge for optimal class handling.
 *
 * @param inputs - Class names, objects, or arrays to merge
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```typescript
 * cn("px-2 py-1", condition && "bg-blue-500", { "font-bold": isActive })
 * // Returns: "px-2 py-1 bg-blue-500 font-bold" (if both conditions true)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
