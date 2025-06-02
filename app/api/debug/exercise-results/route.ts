import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all exercise results for the current user
    const results = await db.exerciseResult.findMany({
      where: {
        userId: profile.userId,
      },
      select: {
        id: true,
        exerciseId: true,
        userId: true,
        score: true,
        createdAt: true,
        isEssayType: true,
        exercise: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`[DEBUG] Found ${results.length} exercise results for user ${profile.userId}`);
    
    // Also get all exercises to compare
    const exercises = await db.exercise.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      where: {
        isActive: true,
      }
    });

    console.log(`[DEBUG] Found ${exercises.length} total exercises`);

    return NextResponse.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
      },
      exerciseResults: results,
      totalExercises: exercises.length,
      exerciseResultsCount: results.length,
      exercises: exercises,
    });
  } catch (error) {
    console.error("[DEBUG_EXERCISE_RESULTS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
