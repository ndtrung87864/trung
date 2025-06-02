import { v4 as uuidv4 } from "uuid";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ serverId: string }> }
){
    try {
        const profile = await currentProfile();
        const { serverId } = await params;

        if(!profile){
            return new NextResponse("Không được cấp quyền", {status: 401});
        }

        if(!serverId){
            return new NextResponse("Thiếu danh sách thành viên", {status: 404});
        }
        
        const server = await db.server.update({
            where: {
                id:serverId,
                profileId: profile.id,
            },
            data: {
                inviteCode: uuidv4(),
            },
        });

        return NextResponse.json(server);

    }catch(error){
        console.error("[SERVER_ID]",error);
        return new NextResponse("Internal Error", {status: 500});
    }
}