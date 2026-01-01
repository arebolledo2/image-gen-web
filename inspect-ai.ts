

import { streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';

async function inspect() {
    console.log('Inspecting AI SDK exports...');

    // Check tool helper
    console.log('Tool helper type:', typeof tool);

    try {
        const result = streamText({
            model: google('gemini-1.5-flash'),
            messages: [{ role: 'user', content: 'hi' }],
        });

        console.log('StreamTextResult keys:', Object.keys(result));
        console.log('StreamTextResult prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
    } catch (e) {
        console.log('Error creating stream:', e);
    }
}

inspect();
