import { z } from "zod";
import type { AIRequestConfig } from "@/lib/ai/config";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";

const chatRequestShape = {
    messages: z.array(z.unknown()),
};

export interface ParsedChatRequest {
    messages: unknown[];
    aiConfig: AIRequestConfig;
}

export function parseChatRequest(payload: unknown):
    | { success: true; data: ParsedChatRequest }
    | { success: false; error: string } {
    return parseBodyWithAIConfig(payload, chatRequestShape);
}
