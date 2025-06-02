import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const channelId = searchParams.get("channelId");

    const whereClause: Prisma.ExerciseWhereInput = {};

    if (channelId && channelId !== "all") {
      whereClause.channelId = channelId;
    } else if (serverId && serverId !== "all") {
      whereClause.channel = {
        serverId: serverId,
      };
    }

    const exercises = await db.exercise.findMany({
      where: whereClause,
      include: {
        model: true,
        field: true,
        channel: {
          include: {
            server: true,
          },
        },
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("[EXERCISES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      name,
      description,
      channelId,
      modelId,
      fieldId,
      deadline,
      fileIds,
    } = await req.json();

    if (!name || !channelId || !modelId || !fieldId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify channel exists and user has access
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              profileId: profile.id,
            },
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found or no access" },
        { status: 404 }
      );
    }

    // Create exercise
    const exercise = await db.exercise.create({
      data: {
        name,
        description,
        channelId,
        modelId,
        fieldId,
        deadline: deadline ? new Date(deadline) : null,
        isActive: true,
      },
      include: {
        model: true,
        field: true,
        channel: {
          include: {
            server: true,
          },
        },
        files: true,
      },
    });

    // Connect files if provided
    if (fileIds && fileIds.length > 0) {
      await db.exercise.update({
        where: { id: exercise.id },
        data: {
          files: {
            connect: fileIds.map((id: string) => ({ id })),
          },
        },
      });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
