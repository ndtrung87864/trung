import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { currentProfile } from "@/lib/current-profile";

// Get a specific exercise
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exercise = await db.exercise.findUnique({
      where: {
        id: id
      },
      include: {
        model: true,
        files: true,
        channel: {
          include: {
            server: true
          }
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to fetch exercise:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise" },
      { status: 500 }
    );
  }
}

// Delete an exercise
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await currentProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if exercise exists
    const exercise = await db.exercise.findUnique({
      where: { id: id },
      include: { files: true },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Không tìm thấy bài tập" },
        { status: 404 }
      );
    }

    // Delete associated files from disk
    if (exercise.files && exercise.files.length > 0) {
      for (const file of exercise.files) {
        try {
          // Extract file path from URL
          const fileName = path.basename(file.url);
          const filePath = path.join(process.cwd(), "public", "uploads", "exercises", fileName);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fileError) {
          console.error("Error deleting file:", file.url, fileError);
          // Continue with deletion even if file cleanup fails
        }
      }
    }

    // Delete the exercise (this will cascade delete file records due to foreign key constraints)
    await db.exercise.delete({
      where: { id: id },
    });

    return NextResponse.json({ 
      success: true,
      message: "Bài tập đã được xóa thành công"
    });
  } catch (error) {
    console.error("Failed to delete exercise:", error);
    
    let errorMessage = "Không thể xóa bài tập";
    
    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        errorMessage = "Không thể xóa bài tập vì còn dữ liệu liên quan";
      } else {
        errorMessage = `Lỗi: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
