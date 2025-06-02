import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const availableModels = [
    { id: "gemini-2.5-pro-preview-03-25", name: "Gemini 2.5 Pro (Preview)", isActive: true },
    { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash (Preview)", isActive: true },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", isActive: true },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash-Lite", isActive: true },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", isActive: true },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", isActive: true },
    { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash-8B", isActive: true },
];

export async function POST() {
    for (const m of availableModels) {
        await db.model.upsert({
            where: { id: m.id },
            update: { name: m.name, isActive: m.isActive },
            create: { id: m.id, name: m.name, isActive: m.isActive },
        });
    }
    return NextResponse.json({ success: true });
}