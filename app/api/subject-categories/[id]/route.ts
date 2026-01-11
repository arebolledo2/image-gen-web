import { NextRequest, NextResponse } from 'next/server';
import { subjectCategoriesService } from '@/lib/services';

interface Params {
    params: Promise<{
        id: string;
    }>;
}

// GET /api/subject-categories/[id] - Get category with details
export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const category = await subjectCategoriesService.getCategoryWithSubjects(id);
        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        return NextResponse.json({ category });
    } catch (error) {
        console.error('Error fetching subject category:', error);
        return NextResponse.json(
            { error: 'Failed to fetch category' },
            { status: 500 }
        );
    }
}

// PATCH /api/subject-categories/[id] - Update category
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const category = await subjectCategoriesService.update(id, body);
        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        return NextResponse.json({ category });
    } catch (error) {
        console.error('Error updating subject category:', error);
        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        );
    }
}

// DELETE /api/subject-categories/[id] - Delete category
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        await subjectCategoriesService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting subject category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
