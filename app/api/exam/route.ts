import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: Request) {
    try {
        const { id, examId, messages, modelId, fieldId } = await req.json();

        // Lấy userId từ currentProfile
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = profile.userId;

        const messageArray = messages || [];

        const exam = await db.exam.findUnique({
            where: { id: examId }
        });


        const data = {
            id: id,
            title: exam?.name || "",
            message: JSON.stringify(messageArray),
            modelId,
            fieldId,
            userId,
            examId,
        };

        // Upsert để cập nhật nếu đã có
        const chatbox = await db.chatbox.upsert({
            where: { id: id },
            update: data,
            create: data,
            include: { model: true, field: true, file: true }
        });

        // Kiểm tra message trước khi parse
        return NextResponse.json({
            ...chatbox,
            messages: chatbox.message ? JSON.parse(chatbox.message) : [],
        });
    } catch (error) {
        console.error('Error saving chatbox:', error);
        return NextResponse.json(
            { error: "Failed to save chatbox" },
            { status: 500 }
        );
    }
}