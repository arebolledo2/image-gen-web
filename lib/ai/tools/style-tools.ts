import { tool } from "ai";
import { z } from "zod";

// Type for style data from API
interface StyleData {
    id: string;
    name: string;
    description?: string;
    version: number;
    palette: Record<string, string[]>;
    renderingCues: Record<string, unknown>;
}

// Schema for style palette
const PaletteSchema = z.object({
    primary: z.array(z.string()).describe("Primary color palette (hex codes)"),
    secondary: z.array(z.string()).describe("Secondary color palette (hex codes)"),
    accent: z.array(z.string()).describe("Accent colors (hex codes)")
});

// Schema for rendering cues
const RenderingCuesSchema = z.object({
    materials: z.array(z.string()).describe("Material descriptions (e.g., 'glossy metal', 'matte plastic')"),
    effects: z.array(z.string()).describe("Visual effects (e.g., 'bloom', 'film grain')"),
    finish: z.string().describe("Overall finish (e.g., 'polished', 'rough')")
});

// Schema for creating a style
const CreateStyleSchema = z.object({
    name: z.string().describe("Name of the style"),
    palette: PaletteSchema,
    renderingCues: RenderingCuesSchema,
    description: z.string().optional().describe("Optional description of the style")
});

export const getAllStyles = tool({
    description: "Get a list of all available art styles. Use this to see what styles exist before creating new ones or when the user asks about available styles.",
    inputSchema: z.object({}),
    execute: async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/styles`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch styles');
        }

        const { styles } = await response.json();
        return {
            count: styles.length,
            styles: styles.map((s: StyleData) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                version: s.version,
                palette: s.palette,
                renderingCues: s.renderingCues
            }))
        };
    }
});

export const createStyle = tool({
    description: "Create a new art style with color palette and rendering cues. Use this when the user wants to define a new visual style for game assets.",
    inputSchema: CreateStyleSchema,
    execute: async (params) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/styles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create style');
        }

        const { style } = await response.json();
        return {
            success: true,
            style: {
                id: style.id,
                name: style.name,
                version: style.version,
                description: style.description
            },
            message: `Successfully created style "${style.name}" (v${style.version})`
        };
    }
});
