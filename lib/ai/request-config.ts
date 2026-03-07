import { z } from "zod";
import { aiRequestConfigInputSchema, type AIRequestConfig, type AIRequestConfigInput } from "@/lib/ai/config";
import { resolveAIRequestConfig } from "@/lib/ai/model";

interface ParseSuccess<T> {
  success: true;
  data: T & { aiConfig: AIRequestConfig };
}

interface ParseFailure {
  success: false;
  error: string;
}

type ParseResult<T> = ParseSuccess<T> | ParseFailure;

function toErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request payload";
}

export function parseBodyWithAIConfig<T extends z.ZodRawShape>(
  payload: unknown,
  shape: T,
): ParseResult<z.infer<z.ZodObject<T>>> {
  const schema = z.object({
    ...shape,
    aiConfig: aiRequestConfigInputSchema.optional(),
  });

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: toErrorMessage(parsed.error),
    };
  }

  const aiConfigInput = (parsed.data as { aiConfig?: AIRequestConfigInput }).aiConfig;

  return {
    success: true,
    data: {
      ...(parsed.data as z.infer<z.ZodObject<T>>),
      aiConfig: resolveAIRequestConfig(aiConfigInput),
    },
  };
}
