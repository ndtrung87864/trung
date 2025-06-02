import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { sendMessageToGemini } from "@/lib/gemini_google";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { exerciseId, resultId, content, modelId, examData, previousMessages = [] } = body;

    if (!exerciseId || !resultId || !content) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Verify that the exercise result belongs to the user
    const result = await db.exerciseResult.findFirst({
      where: {
        id: resultId,
        exerciseId: exerciseId,
        userId: profile.id,
      },
      include: {
        exercise: {
          include: {
            model: true,
          },
        },
      },
    });

    if (!result) {
      return new NextResponse("Result not found or unauthorized", { status: 404 });
    }

    // Prepare data for the AI
    let exerciseDetails = {
      name: result.exercise?.name || result.exercise?.name || "Unknown Exercise",
      description: result.exercise?.description || "",
      type: examData?.exerciseType || "multiple-choice",
      score: result.score,
    };

    let parsedAnswers: any[] = [];
    try {
      // Convert answers to proper format if they're stored as a string
      if (result.answers) {
        if (typeof result.answers === "string") {
          parsedAnswers = JSON.parse(result.answers);
        } else if (Array.isArray(result.answers)) {
          parsedAnswers = result.answers;
        }
      }
    } catch (error) {
      console.error("Error parsing answers:", error);
    }

    // Build the prompt with context from client-side previous messages
    const prompt = buildSupportPrompt(
      content,
      previousMessages,
      exerciseDetails,
      parsedAnswers
    );

    // Use the model specified or a default one
    const actualModelId = modelId || result.exercise?.modelId || "gemini-2.0-flash";

    // Call the AI model
    const aiResponse = await sendMessageToGemini(prompt, actualModelId);

    // Create response message object but don't save to database
    const assistantMessage = {
      id: Date.now().toString(),
      content: aiResponse,
      role: "assistant",
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      message: assistantMessage
    });
  } catch (error) {
    console.error("[EXERCISE_SUPPORT_MESSAGE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

function buildSupportPrompt(
  userMessage: string,
  previousMessages: { role: string; content: string }[],
  exerciseDetails: any,
  answers: any[]
) {
  const contextMessages = previousMessages
    .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  // Format answers for the prompt
  const formattedAnswers = answers
    .map((answer, index) => {
      const questionText = answer.question || `Question ${index + 1}`;
      const userAnswer = answer.userAnswer || answer.answer || "No answer provided";
      const correctAnswer = answer.correctAnswer || "Not available";
      const explanation = answer.explanation || "Not available";
      const score = answer.score !== undefined ? answer.score : "Not scored";
      
      return `Question ${index + 1}: ${questionText}
User's answer: ${userAnswer}
Correct answer: ${correctAnswer}
Explanation: ${explanation}
Score: ${score}
---------------------`;
    })
    .join("\n\n");

  return `You are an AI Assistant helping a student understand their exercise results. Be supportive, educational, and provide detailed explanations.

EXERCISE INFORMATION:
- Name: ${exerciseDetails.name}
- Description: ${exerciseDetails.description}
- Type: ${exerciseDetails.type}
- Overall Score: ${exerciseDetails.score}/10

STUDENT'S ANSWERS AND RESULTS:
${formattedAnswers}

PREVIOUS CONVERSATION:
${contextMessages || "No previous messages"}

Current user message: ${userMessage}

Please respond with a detailed, helpful answer to the student's question. Focus on explaining concepts, correcting misconceptions, and providing constructive feedback. If they ask about a specific question, provide detailed analysis about that question.`;
}
