import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { searchParams } = new URL(req.url);
        const { channelId } = await params;


        const serverId = searchParams.get("serverId");

        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }

        if (!serverId) {
            return new NextResponse("Server ID missing", { status: 400 });
        }

        if (!channelId) {
            return new NextResponse("Thiếu thông tin lớp học", { status: 400 });
            
        }

        const server = await db.server.update({
            where: {
                id: serverId,
                members: {
                    some: {
                        profileId: profile.id,
                        role: {
                            in: [MemberRole.ADMIN, MemberRole.MODERATOR],
                        }
                    },
                }
            },
            data: {
                channels: {
                    delete: {
                        id: channelId,
                        name:{
                            not: "general"
                        }
                    }
                }
            },
        });

        return NextResponse.json(server);

    } catch (error) {
        console.error(error);
        console.error("[CHANNEL_ID_DELETE]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { name, type } = await req.json();
        const { searchParams } = new URL(req.url);
        const { channelId } = await params;


        const serverId = searchParams.get("serverId");

        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }

        if (!serverId) {
            return new NextResponse("Thiếu danh sách thành viên", { status: 400 });
        }

        if (!channelId) {
            return new NextResponse("Thiếu thông tin lớp học", { status: 400 });
            
        }

        if (name === "general") {
            return new NextResponse("Channel name cannot be 'general'", { status: 400 });
        }

        const server = await db.server.update({
            where: {
                id: serverId,
                members: {
                    some: {
                        profileId: profile.id,
                        role: {
                            in: [MemberRole.ADMIN, MemberRole.MODERATOR],
                        }
                    },
                }
            },
            data: {
                channels: {
                    update: {
                        where: {
                            id: channelId,
                            NOT: {
                                name: "general"
                            }
                        },
                        data: {
                            name,
                            type,
                        }
                    }
                }
            },
        });

        return NextResponse.json(server);

    } catch (error) {
        console.error(error);
        console.error("[CHANNEL_ID_PATCH]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
