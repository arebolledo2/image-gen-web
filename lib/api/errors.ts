import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

/**
 * Error with an HTTP status, thrown by services and route helpers
 * and translated to a JSON response by `handleApiError`.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFound = (what: string) => new ApiError(404, `${what} not found`);
export const badRequest = (message: string, extra?: Record<string, unknown>) =>
  new ApiError(400, message, extra);

/**
 * Parse and validate a JSON request body. Throws a 400 `ApiError` on failure.
 */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest('Invalid JSON body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest(firstIssueMessage(result.error));
  }
  return result.data;
}

function firstIssueMessage(error: ZodError): string {
  const issue = error.issues[0];
  const field = issue.path.join('.');
  // Custom messages are already user-facing; only prefix Zod's generic ones with the field
  return field && issue.message.startsWith('Invalid') ? `${field}: ${issue.message}` : issue.message;
}

/**
 * Convert any thrown value to a JSON response. Never exposes stack traces.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }
  console.error(`Error in ${context}:`, error);
  return NextResponse.json(
    { error: `Failed to ${context}`, details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}
