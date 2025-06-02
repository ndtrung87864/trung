import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { currentProfile } from "@/lib/current-profile";
import { v4 as uuidv4 } from "uuid";

// Get all exercises with related model and files
export async function GET() {
    try {
        const profile = await currentProfile();
        
        if (!profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const exercises = await db.exercise.findMany({
            include: {
                model: true,
                files: true,
                channel: {
                    include: {
                        server: true
                    }
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(exercises);
    } catch (error) {
        console.error("Failed to fetch exercises:", error);
        return NextResponse.json(
            { error: "Failed to fetch exercises" },
            { status: 500 }
        );
    }
}

// Create a new exercise
export async function POST(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        if (profile.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        
        const formData = await req.formData();
        
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const modelId = formData.get("modelId") as string;
        const channelId = formData.get("channelId") as string;
        const deadline = formData.get("deadline") as string;
        const isActive = formData.get("isActive") === "true";
        const questionCountStr = formData.get("questionCount") as string;
        const allowReferences = formData.get("allowReferences") === "true";
        const shuffleQuestions = formData.get("shuffleQuestions") === "true";
        
        // Convert questionCount to a number
        const questionCount = questionCountStr ? parseInt(questionCountStr, 10) : null;


        // Validate required fields
        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Tên bài tập là bắt buộc" },
                { status: 400 }
            );
        }

        if (!modelId?.trim()) {
            return NextResponse.json(
                { error: "Mô hình AI là bắt buộc" },
                { status: 400 }
            );
        }

        // Check if model exists and is active
        const model = await db.model.findUnique({
            where: { id: modelId }
        });

        if (!model) {
            return NextResponse.json(
                { error: `Không tìm thấy mô hình AI với ID ${modelId}` },
                { status: 400 }
            );
        }

        if (!model.isActive) {
            return NextResponse.json(
                { error: "Mô hình AI đã chọn hiện không khả dụng" },
                { status: 400 }
            );
        }

        // Validate channel if provided
        if (channelId?.trim()) {
            const channel = await db.channel.findUnique({
                where: { id: channelId }
            });

            if (!channel) {
                return NextResponse.json(
                    { error: `Không tìm thấy kênh với ID ${channelId}` },
                    { status: 400 }
                );
            }
        }

        // Parse deadline safely
        let deadlineDate: Date | null = null;
        if (deadline?.trim()) {
            try {
                deadlineDate = new Date(deadline);
                if (isNaN(deadlineDate.getTime())) {
                    deadlineDate = null;
                    console.warn("Invalid deadline format:", deadline);
                }
            } catch (error) {
                console.error("Error parsing deadline:", error);
                deadlineDate = null;
            }
        }

        // Create the exercise using transaction
        const exercise = await db.$transaction(async (tx) => {

            const newExercise = await tx.exercise.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    modelId,
                    channelId: channelId?.trim() || null,
                    deadline: deadlineDate,
                    isActive,
                    questionCount,
                    allowReferences,
                    shuffleQuestions,
                },
                include: {
                    model: true,
                    channel: {
                        include: {
                            server: true
                        }
                    },
                },
            });


            return newExercise;
        });
        // Handle file uploads if any
        const files = formData.getAll("files") as File[];

        if (files && files.length > 0 && files.some(file => file.size > 0)) {
            const uploadDir = path.join(process.cwd(), "public", "uploads", "exercise");

            // Create directory if it doesn't exist
            try {
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
            } catch (dirError) {
                console.error("Error creating upload directory:", dirError);
                return NextResponse.json(
                    { error: "Không thể tạo thư mục upload" },
                    { status: 500 }
                );
            }

            // Process and save files
            for (const file of files) {
                if (file.size === 0) continue; // Skip empty files
                
                try {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    
                    const fileExt = path.extname(file.name);
                    const uniqueFileName = `${uuidv4()}${fileExt}`;
                    
                    const filePath = path.join(uploadDir, uniqueFileName);

                    // Write file to disk
                    fs.writeFileSync(filePath, buffer);

                    const fileUrl = `/uploads/exercise/${uniqueFileName}`;

                    await db.exerciseFile.create({
                        data: {
                            name: file.name,
                            url: fileUrl,
                            exerciseId: exercise.id,
                        },
                    });

                } catch (fileError) {
                    console.error("Error processing file:", file.name, fileError);
                    // Continue with other files even if one fails
                }
            }

            // Fetch the complete exercise with files
            const updatedExercise = await db.exercise.findUnique({
                where: { id: exercise.id },
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

            return NextResponse.json({
                success: true,
                message: "Bài tập đã được tạo thành công",
                exercise: updatedExercise
            });
        }

        return NextResponse.json({
            success: true,
            message: "Bài tập đã được tạo thành công",
            exercise
        });
    } catch (error) {
        console.error("Failed to create exercise:", error);
        
        // Provide more specific error messages
        let errorMessage = "Không thể tạo bài tập";
        
        if (error instanceof Error) {
            if (error.message.includes("Unique constraint")) {
                errorMessage = "Tên bài tập đã tồn tại";
            } else if (error.message.includes("Foreign key constraint")) {
                errorMessage = "Dữ liệu tham chiếu không hợp lệ";
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

// Update an exercise
export async function PUT(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // Check if user is admin
        if (profile.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        
        const formData = await req.formData();
        
        const exerciseId = formData.get("exerciseId") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const modelId = formData.get("modelId") as string;
        const channelId = formData.get("channelId") as string;
        const deadline = formData.get("deadline") as string;
        const isActive = formData.get("isActive") === "true";
        const questionCountStr = formData.get("questionCount") as string;
        const allowReferences = formData.get("allowReferences") === "true";
        const shuffleQuestions = formData.get("shuffleQuestions") === "true";
        
        // Convert questionCount to a number
        const questionCount = questionCountStr ? parseInt(questionCountStr, 10) : null;


        // Validate required fields
        if (!exerciseId?.trim()) {
            return NextResponse.json(
                { error: "ID bài tập là bắt buộc" },
                { status: 400 }
            );
        }

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Tên bài tập là bắt buộc" },
                { status: 400 }
            );
        }

        if (!modelId?.trim()) {
            return NextResponse.json(
                { error: "Mô hình AI là bắt buộc" },
                { status: 400 }
            );
        }

        // Check if exercise exists
        const existingExercise = await db.exercise.findUnique({
            where: { id: exerciseId },
            include: { files: true }
        });

        if (!existingExercise) {
            return NextResponse.json(
                { error: "Không tìm thấy bài tập" },
                { status: 404 }
            );
        }

        // Check if model exists and is active
        const model = await db.model.findUnique({
            where: { id: modelId }
        });

        if (!model) {
            return NextResponse.json(
                { error: `Không tìm thấy mô hình AI với ID ${modelId}` },
                { status: 400 }
            );
        }

        if (!model.isActive) {
            return NextResponse.json(
                { error: "Mô hình AI đã chọn hiện không khả dụng" },
                { status: 400 }
            );
        }

        // Validate channel if provided
        if (channelId?.trim()) {
            const channel = await db.channel.findUnique({
                where: { id: channelId }
            });

            if (!channel) {
                return NextResponse.json(
                    { error: `Không tìm thấy kênh với ID ${channelId}` },
                    { status: 400 }
                );
            }
        }

        // Parse deadline safely
        let deadlineDate: Date | null = null;
        if (deadline?.trim()) {
            try {
                deadlineDate = new Date(deadline);
                if (isNaN(deadlineDate.getTime())) {
                    deadlineDate = null;
                    console.warn("Invalid deadline format:", deadline);
                }
            } catch (error) {
                console.error("Error parsing deadline:", error);
                deadlineDate = null;
            }
        }

        // Update the exercise
        const updatedExercise = await db.exercise.update({
            where: { id: exerciseId },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                modelId,
                channelId: channelId?.trim() || null,
                deadline: deadlineDate,
                isActive,
                questionCount,
                allowReferences,
                shuffleQuestions,
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

        // Handle file uploads if any
        const files = formData.getAll("files") as File[];

        if (files && files.length > 0 && files.some(file => file.size > 0)) {
            const domain = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const uploadDir = path.join(process.cwd(), "public", "uploads", "exercise");

            // Create directory if it doesn't exist
            try {
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
            } catch (dirError) {
                console.error("Error creating upload directory:", dirError);
                return NextResponse.json(
                    { error: "Không thể tạo thư mục upload" },
                    { status: 500 }
                );
            }

            // Process and save files
            for (const file of files) {
                if (file.size === 0) continue; // Skip empty files
                
                try {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    
                    const fileExt = path.extname(file.name);
                    const uniqueFileName = `${uuidv4()}${fileExt}`;
                    
                    const filePath = path.join(uploadDir, uniqueFileName);

                    // Write file to disk
                    fs.writeFileSync(filePath, buffer);

                    const fileUrl = `/uploads/exercise/${uniqueFileName}`;

                    await db.exerciseFile.create({
                        data: {
                            name: file.name,
                            url: fileUrl,
                            exerciseId: updatedExercise.id,
                        },
                    });

                } catch (fileError) {
                    console.error("Error processing file:", file.name, fileError);
                    // Continue with other files even if one fails
                }
            }

            // Fetch the complete exercise with files
            const finalExercise = await db.exercise.findUnique({
                where: { id: updatedExercise.id },
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

            return NextResponse.json({
                success: true,
                message: "Bài tập đã được cập nhật thành công",
                exercise: finalExercise
            });
        }

        return NextResponse.json({
            success: true,
            message: "Bài tập đã được cập nhật thành công",
            exercise: updatedExercise
        });
    } catch (error) {
        console.error("Failed to update exercise:", error);
        
        // Provide more specific error messages
        let errorMessage = "Không thể cập nhật bài tập";
        
        if (error instanceof Error) {
            if (error.message.includes("Unique constraint")) {
                errorMessage = "Tên bài tập đã tồn tại";
            } else if (error.message.includes("Foreign key constraint")) {
                errorMessage = "Dữ liệu tham chiếu không hợp lệ";
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
