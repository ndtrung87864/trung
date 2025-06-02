import { NextRequest, NextResponse } from "next/server";
import { profanityFilter } from "@/lib/profanity-filter";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: NextRequest) {
    try {
        const profile = await currentProfile();
        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { 
            content, 
            contextType, 
            contextId, 
            serverId 
        } = await req.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { success: false, message: "Invalid content" }, 
                { status: 400 }
            );
        }

        // Trim content để tránh xử lý string rỗng
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return NextResponse.json({
                success: true,
                cleanText: content,
                hasViolation: false
            });
        }

        // Kiểm tra và lọc nội dung với database logging
        const result = await profanityFilter.cleanAndLog(
            trimmedContent,
            profile.userId,
            profile.name,
            contextType || "CHAT",
            contextId,
            serverId
        );

        return NextResponse.json({
            success: true,
            cleanText: result.cleanText,
            hasViolation: result.hasViolation,
            violationId: result.violationId
        });

    } catch (error) {
        console.error("[PROFANITY_FILTER]", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}