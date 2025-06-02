import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const servers = await db.server.findMany({
            select: {
                id: true,
                name: true,
                imageUrl: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(servers);
    } catch (error) {
        console.error("[SERVERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}