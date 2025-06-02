import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { SystemAssistantService } from "@/lib/services/system-assistant.service";

export async function POST(req: NextRequest) {
    try {
        const user = await currentProfile();
        if (!user || user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { command } = await req.json();

        let result = "";

        switch (command) {
            case "analysis":
                result = await SystemAssistantService.generateSystemAnalysisReport();
                break;
            case "recommendations":
                result = await SystemAssistantService.generateSystemRecommendations();
                break;
            default:
                result = "❓ Lệnh không hợp lệ. Các lệnh có sẵn: `analysis`, `recommendations`";
        }

        return NextResponse.json({ result });
    } catch (error) {
        console.error("[SYSTEM_COMMANDS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}