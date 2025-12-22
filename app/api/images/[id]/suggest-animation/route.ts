import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the image record
    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
      with: {
        generation: {
          with: {
            batchPrompt: {
              with: {
                prompt: {
                  with: {
                    style: true,
                    subject: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Construct context for the AI
    const styleName = imageRecord.generation?.batchPrompt?.prompt?.style?.name || 'unknown style';
    const subjectName = imageRecord.generation?.batchPrompt?.prompt?.subject?.name || 'sprite';
    const promptText = imageRecord.generation?.batchPrompt?.prompt?.promptText || 'No prompt available';

    const systemPrompt = `You are an animation expert. Given information about a game sprite image, suggest a creative animation description that would work well for that sprite.

CRITICAL RULES:
1. Suggest a brief, clear animation description (1-2 sentences max)
2. Focus on actions that make sense for the sprite type (enemy, turret, character, etc.)
3. Consider the art style when suggesting animations
4. Be specific about motion (e.g., "walks forward" not just "moves")
5. ONLY output the animation description. No conversational filler.

Good examples:
- "The robot walks forward with mechanical precision, each leg lifting and placing deliberately."
- "The turret rotates smoothly while its barrel recoils from firing energy blasts."
- "The creature bounces energetically from left to right with a playful squash-and-stretch motion."
`;

    const userPrompt = `Sprite Information:
Subject: ${subjectName}
Style: ${styleName}
Original Prompt: ${promptText}

Suggest a creative animation for this sprite that would work as a ${2}x${2}, ${3}x${3}, or ${4}x${4} frame grid.`;

    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const suggestion = text.trim();

    return NextResponse.json({ 
      success: true, 
      suggestion,
    });

  } catch (error) {
    console.error('Error suggesting animation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suggest animation' 
      },
      { status: 500 }
    );
  }
}
