import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id_classroom: string }> }
) {
  try {
    const profile = await currentProfile();
    const { userId, role } = await req.json();

    const { id_classroom } = await params;

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!id_classroom) {
      return new NextResponse("Classroom ID missing", { status: 400 });
    }

    if (!userId || !role) {
      return new NextResponse("User ID and role are required", { status: 400 });
    }

    // Check if the current user is admin of this classroom
    const classroom = await db.server.findFirst({
      where: {
        id: id_classroom,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN]
            }
          }
        }
      }
    });

    if (!classroom) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if user is already a member
    const existingMember = await db.member.findFirst({
      where: {
        serverId: id_classroom,
        profileId: userId
      }
    });

    if (existingMember) {
      return new NextResponse("User is already a member", { status: 400 });
    }

    // Add member to classroom
    const member = await db.member.create({
      data: {
        profileId: userId,
        serverId: id_classroom,
        role: role
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(member);
  } catch (error) {
    console.log("[CLASSROOM_MEMBERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id_classroom: string }> }
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    const { id_classroom } = await params;

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!id_classroom) {
      return new NextResponse("Classroom ID missing", { status: 400 });
    }

    if (!memberId) {
      return new NextResponse("Member ID missing", { status: 400 });
    }

    // Check if the current user is admin of this classroom
    const classroom = await db.server.findFirst({
      where: {
        id: id_classroom,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN]
            }
          }
        }
      }
    });

    if (!classroom) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get the member to be removed
    const memberToRemove = await db.member.findUnique({
      where: {
        id: memberId,
        serverId: id_classroom
      }
    });

    if (!memberToRemove) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Prevent removing the classroom owner
    if (memberToRemove.profileId === classroom.profileId) {
      return new NextResponse("Cannot remove classroom owner", { status: 400 });
    }

    // Remove member from classroom
    await db.member.delete({
      where: {
        id: memberId,
        serverId: id_classroom
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[CLASSROOM_MEMBERS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}