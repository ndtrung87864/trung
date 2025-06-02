import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Get specific exam by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        model: true,
        files: true,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to fetch exam:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam" },
      { status: 500 }
    );
  }
}

// Update exam
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const formData = await req.formData();
    const dataStr = formData.get("data") as string;

    if (!dataStr) {
      return NextResponse.json(
        { error: "No exam data provided" },
        { status: 400 }
      );
    }
    const examData = JSON.parse(dataStr);

    const {
      name,
      description,
      modelId,
      channelId,
      prompt,
      isActive,
      deadline,
      allowReferences,
      shuffleQuestions,
      questionCount,
    } = examData;

    // Update exam details with proper deadline handling
    const updatedExam = await db.exam.update({
      where: { id },
      data: {
        name,
        description,
        modelId,
        channelId,
        prompt,
        isActive,
        // Handle deadline explicitly to ensure null values are processed correctly
        deadline: deadline === null ? null : deadline,
        // Add the new fields with default values if not provided
        allowReferences: allowReferences ?? false,
        shuffleQuestions: shuffleQuestions ?? false,
        questionCount: questionCount ?? 10,
      },
      include: {
        model: true,
        channel: {
          include: {
            server: true,
          },
        },
        files: true,
      },
    });

    // Handle file uploads if any
    const files = formData.getAll("files") as File[];

    if (files && files.length > 0) {
      // Lấy domain từ biến môi trường
      const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

      // Tạo thư mục uploads/files nếu chưa tồn tại
      const uploadDir = path.join(process.cwd(), "public", "uploads", "files");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());

        // Tạo tên file duy nhất bằng cách thêm UUID
        const fileExt = path.extname(file.name);
        const uniqueFileName = `${uuidv4()}${fileExt}`;

        const filePath = path.join(uploadDir, uniqueFileName);

        fs.writeFileSync(filePath, buffer);

        // Create clean URL format: https://example.com/files/filename
        const fileUrl = `${domain}/files/${uniqueFileName}`;

        await db.examFile.create({
          data: {
            name: file.name, // Giữ tên file gốc để hiển thị
            url: fileUrl,
            examId: id,
          },
        });
      }

      const fullExam = await db.exam.findUnique({
        where: { id },
        include: {
          model: true,
          files: true,
          channel: {
            include: {
              server: true,
            },
          },
        },
      });

      return NextResponse.json(fullExam);
    }

    return NextResponse.json(updatedExam);
  } catch (error) {
    console.error("Failed to update exam:", error);
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 }
    );
  }
}

// Delete exam
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, find the exam to get its files
    const exam = await db.exam.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Delete the exam from database (will cascade delete files)
    await db.exam.delete({
      where: { id },
    });

    // Optionally: delete files from filesystem
    // Note: You might want to keep files or implement a separate cleanup process

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return NextResponse.json(
      { error: "Failed to delete exam" },
      { status: 500 }
    );
  }
}
