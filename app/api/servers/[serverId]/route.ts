import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { serverId } = await params;

        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const server = await db.server.delete({
            where: {
                id:serverId,
                profileId: profile.id,
            },
        });

        return NextResponse.json(server);


    } catch (error) {
        console.error("[SERVER_ID_DELETE", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const { serverId } = await params;
        const profile = await currentProfile();
        const { name, imageUrl, isPublic } = await req.json();

        if (!profile) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const server = await db.server.update({
            where: {
                id:serverId,
                profileId: profile.id,
            },
            data: {
                name,
                imageUrl,
                isPublic,
            },
        });

        return NextResponse.json(server);


    } catch (error) {
        console.error("[SERVER_ID_PATCH", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serverId } = await params;

    const server = await db.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        channels: {
          orderBy: {
            createdAt: "asc",
          },
        },
        members: {
          where: {
            status: "ACTIVE",
          },
          include: {
            profile: true,
          },
          orderBy: {
            role: "asc",
          }
        }
      }
    });

    if (!server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }

    // Check if the user is a member of this server
    const isUserMember = server.members.some(member => 
      member.profileId === profile.id
    );

    if (!isUserMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error("[SERVER_GET]", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}