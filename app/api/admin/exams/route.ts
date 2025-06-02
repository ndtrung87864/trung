import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");

        const whereConditions: any = {};

        if (serverId) {
            whereConditions.channel = {
                serverId: serverId
            };
        }

        const exams = await db.exam.findMany({
            where: whereConditions,
            select: {
                id: true,
                name: true,
                description: true,
                channel: {
                    select: {
                        id: true,
                        name: true,
                        server: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(exams);
    } catch (error) {
        console.error("[EXAMS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}