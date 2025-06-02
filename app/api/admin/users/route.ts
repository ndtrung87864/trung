import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

// export async function POST(
//     req: Request,
// ) {
//     try {
//         const profile = await currentProfile();
//         const {name, type} = await req.json();
//         const { searchParams } = new URL(req.url);

//         const serverId = searchParams.get("serverId");
        
//         if (!profile) {
//             return new NextResponse("Không được cấp quyền", { status: 401 });
//         }
        
//         if(!serverId){
//             return new NextResponse("Thông tin danh sách thành viên bị thiếu", { status: 400 });
//         }

//         if(name === "general"){
//             return new NextResponse("Tên lớp học không được để là: 'general'", { status: 400 });
//         }

//         const server = await db.server.update({
//             where:{
//                 id: serverId,
//                 members:{
//                     some:{
//                         profileId: profile.id,
//                         role: {
//                             in: [MemberRole.ADMIN, MemberRole.MODERATOR]
//                         }
//                     }
//                 }
//             },
//             data:{
//                 channels:{
//                     create:{
//                         profileId: profile.id,
//                         name,
//                         type,
//                     }
//                 }
//             }
//         });

//         return NextResponse.json(server);
//     } catch (error) {
//         console.error("CHANNELS_POST",error);
//         return new NextResponse("Không thể tìm thấy toàn bộ danh sách thành viên", { status: 500 });
//     }
// }

export async function GET(){
    try {
        const profile = await currentProfile();

        if (!profile) {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }

        if (profile.role !== "ADMIN") {
            return new NextResponse("Không được cấp quyền", { status: 401 });
        }


        // const users = await db.profile.findMany({
        //     where: {
        //         NOT: {
        //             id: profile.id
        //         }
        //     },
        //     include: {
        //         servers: true,
        //         _count: true
        //     }
        // });

        const users = await db.profile.findMany({
            where: {
                NOT: {
                    id: profile.id
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("[USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
  req: Request,
) {
  try {
    const profile = await currentProfile();
    const { role, userId } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (profile.role !== UserRole.ADMIN) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Update user role
    const updatedUser = await db.profile.update({
      where: {
        id: userId,
      },
      data: {
        role,
      },
    });

    return NextResponse.json("OK",{ status: 200 });
  } catch (error) {
    console.error("[USER_ROLE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// export async function POST(
//     req: Request,
// ) {
//     try {
//         const profile = await currentProfile();
//         const {name, type} = await req.json();
//         const { searchParams } = new URL(req.url);

//         const serverId = searchParams.get("serverId");
        
//         if (!profile) {
//             return new NextResponse("Không được cấp quyền", { status: 401 });
//         }
        
//         if(!serverId){
//             return new NextResponse("Thông tin danh sách thành viên bị thiếu", { status: 400 });
//         }

//         if(name === "general"){
//             return new NextResponse("Tên lớp học không được để là: 'general'", { status: 400 });
//         }

//         const server = await db.server.update({
//             where:{
//                 id: serverId,
//                 members:{
//                     some:{
//                         profileId: profile.id,
//                         role: {
//                             in: [MemberRole.ADMIN, MemberRole.MODERATOR]
//                         }
//                     }
//                 }
//             },
//             data:{
//                 channels:{
//                     create:{
//                         profileId: profile.id,
//                         name,
//                         type,
//                     }
//                 }
//             }
//         });

//         return NextResponse.json(server);
//     } catch (error) {
//         console.error("CHANNELS_POST",error);
//         return new NextResponse("Không thể tìm thấy toàn bộ danh sách thành viên", { status: 500 });
//     }
// }
