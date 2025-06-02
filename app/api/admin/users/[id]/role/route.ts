import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const profile = await currentProfile();
    const { role } = await req.json();
    const { searchParams } = new URL(req.url);
    const { userId } = await params;

    // console.log(role)
    // console.log(userId)

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (profile.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    if (!role || !["USER", "ADMIN",].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
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

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_ROLE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}