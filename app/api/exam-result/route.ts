import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const examId = url.searchParams.get("examId");
    const userId = url.searchParams.get("userId");

    if (!examId || !userId) {
      return NextResponse.json({ error: "Missing examId or userId" }, { status: 400 });
    }

    const result = await db.examResult.findFirst({
      where: {
        examId,
        userId,
      },
    });

    // Always return a valid JSON response, even when no result is found
    return NextResponse.json(result || { exists: false });
  } catch (error) {
    console.error("Error in exam-result API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
