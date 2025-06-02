import { NextResponse } from 'next/server';
import { updateModel, deleteModel, getModelById } from '@/lib/modelService';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const model = await getModelById(id);
    return NextResponse.json(model);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { name, isActive } = await req.json();
    const { id } = await params;
    const model = await updateModel(id, { name, isActive });
    return NextResponse.json(model);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const model = await deleteModel(id);
    return NextResponse.json(model);
}