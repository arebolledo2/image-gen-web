import { createAgentUIStreamResponse } from "ai";
import { imageAgent } from "@/lib/agent";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        return createAgentUIStreamResponse({
            agent: imageAgent,
            uiMessages: messages,
        });
    } catch (error: unknown) {
        console.error("Error in chat route:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
