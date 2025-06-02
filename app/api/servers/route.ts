import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { name, imageUrl, isPublic } = await req.json();
        const profile = await currentProfile();

        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const server = await db.server.create({
            data: {
                profileId: profile.id,
                name,
                imageUrl,
                isPublic: isPublic ?? true, // Default to true if not provided
                inviteCode: uuidv4(),
                channels: {
                    create: [
                        {
                            name: "general", 
                            profileId: profile.id,
                        },
                    ]
                },
                members: {
                    create: [
                        {
                            profileId: profile.id, 
                            role: MemberRole.ADMIN,
                            status: "ACTIVE"
                        },
                    ]
                }
            }
        });
        return NextResponse.json(server);
        
    } catch (error) {
        console.error("SERVER_POST", error);
        return new NextResponse(
            JSON.stringify({ message: "Something went wrong", error}),
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
      const profile = await currentProfile();

      if (!profile) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      // Get servers where user is a member and exclude servers with name "general"
      const servers = await db.server.findMany({
        where: {
          members: {
            some: {
              profileId: profile.id
            }
          },
          NOT: {
            name: "general"  // Exclude servers named "general"
          }
        },
        orderBy: {
          name: "asc"
        }
      });

      return NextResponse.json(servers);
    } catch (error) {
      console.error("[SERVERS_GET]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
}
