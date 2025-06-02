import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { name, userId, modelId, prompt } = await req.json();
    const { id } = await params;
    const field = await prisma.field.update({
        where: { id: id },
        data: {
            name,
            modelId,
            prompt
        },
    });
    return NextResponse.json(field);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const field = await prisma.field.delete({
        where: { id: id },
    });
    return NextResponse.json(field);
}