import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const { examId } = await context.params;

    const { message } = await req.json();

    if (!examId) {
      return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
    }

    // Lấy thông tin model từ database
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { model: true },
    });

    if (!exam || !exam.model) {
      return NextResponse.json({ error: "Exam or model not found" }, { status: 404 });
    }

    const modelId = exam.model.id;

    // Trả về phản hồi sử dụng model từ database
    return NextResponse.json({
      reply: `Model "${exam.model.name}" đã được sử dụng để xử lý tin nhắn: "${message}".`,
    });
  } catch (error) {
    console.error("[EXAM_GEMINI]", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý bài kiểm tra. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
