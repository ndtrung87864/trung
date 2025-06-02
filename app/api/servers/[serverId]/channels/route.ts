import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    const { serverId } = params;

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!serverId) {
      return new NextResponse("Server ID missing", { status: 400 });
    }

    // Check if user is member of the server
    const server = await db.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id
          }
        }
      },
      include: {
        channels: true
      }
    });

    if (!server) {
      return new NextResponse("Server not found or access denied", { status: 404 });
    }

    return NextResponse.json(server.channels);
  } catch (error) {
    console.error("[SERVER_CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
