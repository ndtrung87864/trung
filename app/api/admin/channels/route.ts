import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get all channels from servers where the user is a member
        const channels = await db.channel.findMany({
            where: {
                type: "TEXT",
                NOT: {
                    name: "general"
                },
                server: {
                    members: {
                        some: {
                            profileId: profile.id
                        }
                    }
                }
            },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(channels);
    } catch (error) {
        console.error("Failed to fetch channels:", error);
        return NextResponse.json(
            { error: "Failed to fetch channels" },
            { status: 500 }
        );
    }
}
