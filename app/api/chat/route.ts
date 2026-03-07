import { createAgentUIStreamResponse } from "ai";
import { createImageAgent } from "@/lib/agent";
import { getAnalysisModelForConfig, getChatModelForConfig } from "@/lib/ai/model";
import { parseChatRequest } from "./request";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        const parsed = parseChatRequest(payload);
        if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { messages, aiConfig } = parsed.data;
        const agent = createImageAgent({
            chatModel: getChatModelForConfig(aiConfig),
            analysisModel: getAnalysisModelForConfig(aiConfig),
            analysisProvider: aiConfig.analysis.provider,
            analysisModelId: aiConfig.analysis.model,
            aiConfig,
        });

        return createAgentUIStreamResponse({
            agent,
            uiMessages: messages,
        });
    } catch (error: unknown) {
        console.error("Error in chat route:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
