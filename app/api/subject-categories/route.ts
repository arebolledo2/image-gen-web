import { NextRequest, NextResponse } from 'next/server';
import { subjectCategoriesService } from '@/lib/services';

// GET /api/subject-categories - List all categories
export async function GET() {
    try {
        const categories = await subjectCategoriesService.getAllCategories();
        return NextResponse.json({ categories });
    } catch (error) {
        console.error('Error fetching subject categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

// POST /api/subject-categories - Create a new category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, color, description } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        const category = await subjectCategoriesService.createCategory({
            name,
            color,
            description,
        });

        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        console.error('Error creating subject category:', error);
        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        );
    }
}
