import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";

export async function GET() {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const chatboxes = await db.chatbox.findMany({
            include: {
                model: true,
                field: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const assistants = chatboxes.map(chatbox => ({
            id: chatbox.id,
            name: `${chatbox.field?.name || 'Trợ lý'} Assistant`,
            fieldName: chatbox.field?.name || 'Chung',
            fieldId: chatbox.fieldId,
            modelName: chatbox.model?.name || 'Unknown Model',
            prompt: chatbox.field?.prompt || '',
            isActive: chatbox.model?.isActive
        }));

        return NextResponse.json(assistants);

    } catch (error) {
        console.error("[GET_ASSISTANTS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}