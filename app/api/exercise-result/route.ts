import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);    const exerciseId = searchParams.get("exerciseId");
    const userId = searchParams.get("userId") || profile.id;
    
    // Handle array of exercise IDs
    let exerciseIds: string[] = [];
    const exerciseIdsParam = searchParams.get("exerciseIds");
    
    if (exerciseIdsParam) {
      try {
        exerciseIds = JSON.parse(exerciseIdsParam);
      } catch (e) {
        console.error("Error parsing exerciseIds:", e);
      }
    } else if (exerciseId) {
      exerciseIds = [exerciseId];
    }    if (exerciseIds.length === 0 && !exerciseId) {
      return new NextResponse("Missing exerciseId or exerciseIds", { status: 400 });
    }

    // Query to use either single ID or array of IDs
    let whereClause;
    if (exerciseIds.length > 0) {
      whereClause = { exerciseId: { in: exerciseIds }, userId };
    } else if (exerciseId) {
      whereClause = { exerciseId, userId };
    } else {
      return new NextResponse("Invalid exercise parameters", { status: 400 });
    }    // Get all exercise results with more detailed information
    const results = await db.exerciseResult.findMany({
      where: whereClause,
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            channel: {
              select: {
                id: true,
                serverId: true,
                server: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Enhance results with exercise type information
    const enhancedResults = results.map(result => {
      // Determine exercise type based on isEssayType field
      let exerciseType = result.isEssayType ? "essay" : "multiple-choice";
      
      // Check answers for type information
      if (result.answers) {
        try {
          // Parse answers if it's a string
          const parsedAnswers = typeof result.answers === 'string' 
            ? JSON.parse(result.answers) 
            : result.answers;
          
          if (Array.isArray(parsedAnswers) && parsedAnswers.length > 0) {
            // Check first answer for type information
            const firstAnswer = parsedAnswers[0];
            
            if (firstAnswer?.type === "written") {
              exerciseType = "written";
            } else if (firstAnswer?.type === "essay" || firstAnswer?.fileUrl) {
              exerciseType = "essay";
            }
          }
        } catch (e) {
          console.error("Error processing result answers:", e);
        }
      }
      
      // Safely parse answers for client use
      let formattedAnswers;
      try {
        formattedAnswers = typeof result.answers === 'string' 
          ? JSON.parse(result.answers || '[]') 
          : (result.answers || []);
      } catch (e) {
        console.error("Error parsing result answers:", e);
        formattedAnswers = [];
      }
      
      // Return enhanced result with exerciseType
      return {
        ...result,
        exerciseType,
        answers: formattedAnswers,
        channelId: result.exercise?.channel?.id,
        serverId: result.exercise?.channel?.serverId,
        serverInfo: result.exercise?.channel?.server,
      };
    });

    return NextResponse.json(enhancedResults);
  } catch (error) {
    console.error("[EXERCISE_RESULT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {

    const profile = await currentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { exerciseId, answers, score, exerciseType } = body;

    if (!exerciseId || !answers || score === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if exercise exists
    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    // Check if user already has a result for this exercise
    const existingResult = await db.exerciseResult.findFirst({
      where: {
        exerciseId,
        userId: profile.userId,
      },
    });

    if (existingResult) {
      return NextResponse.json(
        { error: "Exercise already submitted" },
        { status: 409 }
      );
    }
   
    const exerciseResult = await db.exerciseResult.create({
      data: {
        userId: profile.userId,
        exerciseId,
        score: typeof score === "number" ? score : parseFloat(score) || 0,
        answers: JSON.stringify(answers),
        isEssayType: exerciseType === "essay" || exerciseType === "written",
      },
    });


    return NextResponse.json({
      id: exerciseResult.id,
      submissionId: exerciseResult.id,
      success: true,
      score: exerciseResult.score,
    });
  } catch (error) {
    console.error("Error creating exercise result:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
