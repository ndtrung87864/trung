import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ serverId: string; memberId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { serverId, memberId } = await params;

        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Kiểm tra quyền admin/moderator
        const server = await db.server.findFirst({
            where: {
                id: serverId,
                members: {
                    some: {
                        profileId: profile.id,
                        role: {
                            in: ["ADMIN", "MODERATOR"]
                        }
                    }
                }
            }
        });

        if (!server) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Duyệt member
        const member = await db.member.update({
            where: {
                id: memberId,
                serverId: serverId,
                status: "PENDING"
            },
            data: {
                status: "ACTIVE",
                approvedAt: new Date(),
                approvedBy: profile.id
            }
        });

        return NextResponse.json(member);
    } catch (error) {
        console.log("[MEMBER_APPROVE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}