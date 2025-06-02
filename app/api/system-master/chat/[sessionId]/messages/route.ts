import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { SystemAssistantService } from "@/lib/services/system-assistant.service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await currentProfile();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { sessionId } = await params;

        const messages = await db.systemMessage.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("[SYSTEM_MESSAGES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await currentProfile();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { sessionId } = await params;
        const { role, content } = await req.json();

        // Add user message
        await db.systemMessage.create({
            data: {
                sessionId,
                role,
                content
            }
        });

        // Generate AI response if user message
        if (role === 'USER') {
            const aiResponse = await SystemAssistantService.generateIntelligentResponse(
                content,
                sessionId
            );

            await db.systemMessage.create({
                data: {
                    sessionId,
                    role: 'ASSISTANT',
                    content: aiResponse
                }
            });
        }

        return new NextResponse("Message sent", { status: 200 });
    } catch (error) {
        console.error("[SYSTEM_MESSAGES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}