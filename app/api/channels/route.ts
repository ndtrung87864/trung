import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
) {
    try {
        const profile = await currentProfile();
        const {name, type} = await req.json();
        const { searchParams } = new URL(req.url);

        const serverId = searchParams.get("serverId");
        
        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }
        
        if(!serverId){
            return new NextResponse("Thông tin danh sách thành viên bị thiếu", { status: 400 });
        }

        if(name === "general"){
            return new NextResponse("Tên lớp học không được để là: 'general'", { status: 400 });
        }

        const server = await db.server.update({
            where:{
                id: serverId,
                members:{
                    some:{
                        profileId: profile.id,
                        role: {
                            in: [MemberRole.ADMIN, MemberRole.MODERATOR]
                        }
                    }
                }
            },
            data:{
                channels:{
                    create:{
                        profileId: profile.id,
                        name,
                        type,
                    }
                }
            }
        });

        return NextResponse.json(server);
    } catch (error) {
        console.error("CHANNELS_POST",error);
        return new NextResponse("Không thể tìm thấy toàn bộ danh sách thành viên", { status: 500 });
    }
}