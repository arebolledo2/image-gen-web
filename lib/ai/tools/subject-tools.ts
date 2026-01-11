import { tool } from "ai";
import { z } from "zod";

// Type for subject data from API
interface SubjectData {
    id: string;
    name: string;
    description: string;
    isTransparent: boolean;
}

// Schema for creating a subject
const CreateSubjectSchema = z.object({
    name: z.string().describe("Name of the subject (e.g., 'Mechanical Spider Turret')"),
    description: z.string().describe("Detailed description of the subject"),
    isTransparent: z.boolean().optional().default(true).describe("Whether the subject should have a transparent background")
});

export const getAllSubjects = tool({
    description: "Get a list of all available subjects. Use this to see what subjects exist before creating new ones or when the user asks about available subjects.",
    inputSchema: z.object({}),
    execute: async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/subjects`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch subjects');
        }

        const { subjects } = await response.json();
        return {
            count: subjects.length,
            subjects: subjects.map((s: SubjectData) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                isTransparent: s.isTransparent
            }))
        };
    }
});

export const createSubject = tool({
    description: "Create a new subject for game assets. A subject represents what will be generated (e.g., a character, enemy, item). Use this when the user wants to define a new game asset type.",
    inputSchema: CreateSubjectSchema,
    execute: async (params) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create subject');
        }

        const { subject } = await response.json();
        return {
            success: true,
            subject: {
                id: subject.id,
                name: subject.name,
                description: subject.description,
                isTransparent: subject.isTransparent
            },
            message: `Successfully created subject "${subject.name}"`
        };
    }
});
