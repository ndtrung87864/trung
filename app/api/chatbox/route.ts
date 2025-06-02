import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { currentProfile } from "@/lib/current-profile"; // Thêm dòng này

// Lấy danh sách chatbox (kèm field, model, file)
export async function GET(req: Request) {
    // Lấy userId từ currentProfile
    const profile = await currentProfile();
    if (!profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = profile.userId;

    // Chỉ lấy chatbox của user hiện tại
    const chatboxes = await db.chatbox.findMany({
        where: { userId },
        include: {
            model: true,
            field: true,
            file: true,
        },
        orderBy: { updatedAt: 'desc' }
    });
    // Parse message JSON trước khi trả về
    return NextResponse.json(chatboxes.map(cb => ({
        ...cb,
        messages: JSON.parse(cb.message),
    })));
}

// Thêm/sửa chatbox
export async function POST(req: Request) {
    try {
        const { title, messages, modelId, fieldId, fileId, sessionId } = await req.json();

        // Lấy userId từ currentProfile
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = profile.userId;

        if (!sessionId || !modelId || !fieldId) {
            return NextResponse.json({ error: 'sessionId, modelId, fieldId là bắt buộc' }, { status: 400 });
        }

        // Đảm bảo messages không bao giờ là undefined
        const messageArray = messages || [];

        const data = {
            id: sessionId,
            title,
            message: JSON.stringify(messageArray), // Đảm bảo luôn stringify một array
            modelId,
            fieldId,
            fileId,
            userId, // Lấy từ currentProfile
        };

        // Upsert để cập nhật nếu đã có
        const chatbox = await db.chatbox.upsert({
            where: { id: sessionId },
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

// Xóa chatbox
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await db.chatbox.delete({ where: { id } });
    return NextResponse.json({ success: true });
}