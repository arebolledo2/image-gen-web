import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

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

    // Load the actual image file
    const filePathToLoad = imageRecord.transparentFilePath || imageRecord.filePath;
    const absolutePath = path.isAbsolute(filePathToLoad)
      ? filePathToLoad
      : path.join(process.cwd(), filePathToLoad);

    const imageBuffer = await fs.readFile(absolutePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageRecord.mediaType || 'image/png';

    // Construct context for the AI
    const styleName = imageRecord.generation?.batchPrompt?.prompt?.style?.name || 'unknown style';
    const subjectName = imageRecord.generation?.batchPrompt?.prompt?.subject?.name || 'sprite';

    const systemPrompt = `You are an animation expert analyzing game sprite images. Based on what you SEE in the image, suggest a creative animation description.

CRITICAL RULES:
1. Carefully LOOK at the image and describe what you actually see
2. Suggest a brief, clear animation description (1-2 sentences max)
3. Focus on actions that make sense for what you see in the sprite
4. Be specific about motion (e.g., "walks forward" not just "moves")
5. Consider the visual style and shape of the sprite
6. ONLY output the animation description. No conversational filler.
7. Base your suggestion on the VISUAL content, not just the metadata

Good examples:
- For a robot enemy: "The robot walks forward with mechanical precision, each leg lifting and placing deliberately."
- For a turret: "The turret rotates smoothly while its barrel recoils from firing energy blasts."
- For a flying drone: "The drone hovers with subtle bobbing motion while its propellers spin continuously."
`;

    const userPrompt = `Analyze this game sprite image (Subject: ${subjectName}, Style: ${styleName}) and suggest a creative animation that would work as a sprite sheet with 4-16 frames. Base your suggestion on what you actually see in the image.`;

    const { text } = await generateText({
      model: google('gemini-3.1-flash-preview'),
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: systemPrompt + '\n\n' + userPrompt },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Image}`,
            },
          ],
        },
      ],
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
