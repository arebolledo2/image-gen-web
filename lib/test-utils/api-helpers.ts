/**
 * Test helpers for API route handler tests.
 *
 * Provides utilities for creating mock NextRequest objects and
 * extracting JSON from NextResponse objects.
 *
 * Usage: Add `// @vitest-environment node` to test files that use these helpers.
 */
import { NextRequest } from 'next/server';

/**
 * Create a mock NextRequest for GET requests
 */
export function createGETRequest(
  path: string,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
}

/**
 * Create a mock NextRequest for POST/PATCH/DELETE requests
 */
export function createJSONRequest(
  path: string,
  body: unknown,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Create route context with dynamic params (Next.js App Router style)
 * Next.js 15+ uses Promise-based params
 */
export function createRouteContext<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

/**
 * Extract status and JSON body from a Response or NextResponse.
 * NextResponse.json() may not return a standard Response in test environments,
 * so we handle both cases.
 */
export async function parseResponse<T = unknown>(
  response: Response | { status: number; body?: ReadableStream | null; json?: () => Promise<T> }
): Promise<{ status: number; body: T }> {
  // Try standard .json() first
  if (typeof response.json === 'function') {
    try {
      const body = await response.json() as T;
      return { status: response.status, body };
    } catch {
      // Fall through to body parsing
    }
  }

  // Fallback: read from body stream
  const res = response as Response;
  if (res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    return { status: res.status, body: JSON.parse(text) as T };
  }

  return { status: response.status, body: {} as T };
}
