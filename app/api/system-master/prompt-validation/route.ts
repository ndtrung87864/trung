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

        // Fetch chatboxes with their prompts
        const chatboxes = await db.chatbox.findMany({
            include: {
                model: true,
                field: {
                    include: {
                        Channel: {
                            include: {
                                server: true
                            }
                        }
                    }
                }
            }
        });

        // Process assistants data
        const assistants = chatboxes.map(chatbox => {
            const channel = chatbox.field?.Channel?.[0];

            return {
                id: chatbox.id,
                name: `${chatbox.field?.name || 'General'} Assistant`,
                fieldName: chatbox.field?.name || 'General',
                modelName: chatbox.model.name,
                originalPrompt: chatbox.field?.prompt || 'No prompt configured',
                status: 'COMPLETED' as const,
                overallScore: Math.random() * 40 + 60, // Mock score 60-100
                promptAdherence: Math.random() * 30 + 70, // Mock adherence 70-100
                testResults: [], // Will be populated by testing
                lastTested: new Date().toISOString()
            };
        });

        return NextResponse.json(assistants);

    } catch (error) {
        console.error("[PROMPT_VALIDATION_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}