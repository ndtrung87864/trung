import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export async function GET(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exerciseId = params.exerciseId;

    if (!exerciseId) {
      return NextResponse.json(
        { error: "Exercise ID is required" },
        { status: 400 }
      );
    }

    const exercise = await db.exercise.findUnique({
      where: {
        id: exerciseId,
        isActive: true,
      },
      include: {
        model: {
          select: {
            id: true,
            name: true,
          },
        },
        files: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            serverId: true,
          },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }    // Format the response to match expected structure
    const formattedExercise = {
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      deadline: exercise.deadline?.toISOString() || null,
      model: exercise.model
        ? {
            id: exercise.model.id,
            name: exercise.model.name,
          }
        : null,
      files: exercise.files || [],
      channel: exercise.channel
        ? {
            id: exercise.channel.id,
            name: exercise.channel.name,
            serverId: exercise.channel.serverId,
          }
        : null,
      isActive: exercise.isActive,
      allowReferences: exercise.allowReferences,
      questionCount: exercise.questionCount,
      shuffleQuestions: exercise.shuffleQuestions,
    };

    return NextResponse.json(formattedExercise);
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exerciseId = params.exerciseId;
    const {
      name,
      description,
      channelId,
      modelId,
      fieldId,
      prompt,
      deadline,
      isActive,
      fileIds,
    } = await req.json();

    // Check if exercise exists
    const existingExercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Update exercise
    const exercise = await db.exercise.update({
      where: { id: exerciseId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(channelId && { channelId }),
        ...(modelId && { modelId }),
        ...(fieldId && { fieldId }),
        ...(prompt !== undefined && { prompt }),
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
        ...(isActive !== undefined && { isActive }),
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

    // Update file connections if provided
    if (fileIds !== undefined) {
      await db.exercise.update({
        where: { id: exerciseId },
        data: {
          files: {
            set: fileIds.map((id: string) => ({ id })),
          },
        },
      });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("[EXERCISE_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { exerciseId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exerciseId = params.exerciseId;

    // Check if exercise exists
    const existingExercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!existingExercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Delete exercise (this will cascade delete related records)
    await db.exercise.delete({
      where: { id: exerciseId },
    });

    return NextResponse.json({ message: "Exercise deleted successfully" });
  } catch (error) {
    console.error("[EXERCISE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
