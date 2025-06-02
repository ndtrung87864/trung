import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ memberId: string }> }
) {

    try {
        const profile = await currentProfile();
        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const { memberId } = await params;

        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }

        if (!serverId) {
            return new NextResponse("Thiếu danh sách thành viên", { status: 400 });
        }

        if (!memberId) {
            return new NextResponse("Thông tin thành viên chưa xác định", { status: 400 });
        }


        const server = await db.server.update({
            where: {
                id: serverId,
                profileId: profile.id
            },
            data: {
                members: {
                    deleteMany: {
                        id:memberId,
                        profileId: {
                            not: profile.id
                        }
                    }
                }
            },
            include: {
                members: {
                    include: {
                        profile: true
                    },
                    orderBy: {
                        role: "asc"
                    }
                },
            },
        });

        return NextResponse.json(server);

    } catch (error) {
        console.error("[MEMBERS_ID_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ memberId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { searchParams } = new URL(req.url);
        const { role } = await req.json();
        const serverId = searchParams.get("serverId");

        const { memberId } = await params; //or const { memberId: id } = await params;

        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }

        if (!serverId) {
            return new NextResponse("Thiếu danh sách thành viên", { status: 400 });
        }

        if (!memberId) {
            return new NextResponse("Thông tin thành viên chưa xác định", { status: 400 });

        }

        const server = await db.server.update({
            where: {
                id: serverId,
                profileId: profile.id
            },
            data: {
                members: {
                    update: {
                        where: {
                            id:memberId,
                            profileId: {
                                not: profile.id
                            }
                        },
                        data: {
                            role
                        }
                    }
                }
            },
            include: {
                members: {
                    include: {
                        profile: true
                    },
                    orderBy: {
                        role: "asc"
                    }
                }
            }
        })

        return NextResponse.json(server);
    } catch (error) {
        console.error("[MEMBERS_ID_PATCH]", error);
        return new NextResponse("Internal", { status: 500 });
    }
}