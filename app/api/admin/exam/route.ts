import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { currentProfile } from "@/lib/current-profile";
import { v4 as uuidv4 } from "uuid";

// Function to normalize Vietnamese text to folder-friendly format
function normalizeFolderName(name: string): string {
    // Remove diacritical marks (accents)
    const normalized = name.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Remove combining diacritical marks
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')  // Replace Vietnamese 'đ/Đ'
        .toLowerCase()  // Convert to lowercase
        .replace(/\s+/g, '_');  // Replace spaces with underscores

    return normalized;
}

// Get all exams with related model and files
export async function GET() {
    try {
        const exams = await db.exam.findMany({
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

        return NextResponse.json(exams);
    } catch (error) {
        console.error("Failed to fetch exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        );
    }
}

// Create a new exam
export async function POST(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const formData = await req.formData();
        const dataStr = formData.get("data") as string;

        if (!dataStr) {
            return NextResponse.json(
                { error: "No exam data provided" },
                { status: 400 }
            );
        }        const examData = JSON.parse(dataStr);
        
        // Add debugging logs for CREATE
        console.log("=== CREATE EXAM DEBUG ===");
        console.log("Received exam data:", examData);
        console.log("allowReferences in examData:", examData.allowReferences);
        console.log("shuffleQuestions in examData:", examData.shuffleQuestions);
        console.log("allowReferences type:", typeof examData.allowReferences);
        console.log("shuffleQuestions type:", typeof examData.shuffleQuestions);
          const { name, description, modelId, channelId, prompt, isActive, allowReferences, shuffleQuestions, questionCount } = examData;
        
        console.log("Destructured allowReferences:", allowReferences);
        console.log("Destructured shuffleQuestions:", shuffleQuestions);
        console.log("Destructured questionCount:", questionCount);
        console.log("=== END CREATE DEBUG ===");

        if (!name || !modelId) {
            return NextResponse.json(
                { error: "Name and model are required" },
                { status: 400 }
            );
        }

        // Check if model exists
        const model = await db.model.findUnique({
            where: { id: modelId }
        });

        if (!model) {
            return NextResponse.json(
                { error: `Model with ID ${modelId} not found` },
                { status: 400 }
            );
        }        // Create the exam
        const exam = await db.exam.create({
            data: {
                name,
                description,
                modelId,
                channelId, 
                prompt,
                isActive: isActive ?? true,
                deadline: examData.deadline || null,
                allowReferences: examData.allowReferences ?? false,
                shuffleQuestions: examData.shuffleQuestions ?? false,
                questionCount: questionCount ?? 10,
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

        // Handle file uploads if any
        const files = formData.getAll("files") as File[];

        if (files && files.length > 0 && files[0].size > 0) {
            // Lấy domain từ biến môi trường
            const domain = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
            
            // Tạo thư mục uploads/files nếu chưa tồn tại
            const uploadDir = path.join(process.cwd(), "public", "uploads", "files");

            // Create directory if it doesn't exist
            try {
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
            } catch (err) {
                console.error("Failed to create upload directory:", err);
                return NextResponse.json(
                    { error: "Failed to create upload directory" },
                    { status: 500 }
                );
            }

            // Process and save files
            for (const file of files) {
                const buffer = Buffer.from(await file.arrayBuffer());
                
                // Tạo tên file duy nhất bằng cách thêm UUID
                const fileExt = path.extname(file.name);
                const uniqueFileName = `${uuidv4()}${fileExt}`;
                
                const filePath = path.join(uploadDir, uniqueFileName);

                // Write file to disk
                fs.writeFileSync(filePath, buffer);

                // Create clean URL format: https://example.com/files/filename
                const fileUrl = `${domain}/files/${uniqueFileName}`;

                await db.examFile.create({
                    data: {
                        name: file.name, // Giữ tên file gốc để hiển thị
                        url: fileUrl,
                        examId: exam.id,
                    },
                });
            }

            // Fetch the complete exam with files
            const updatedExam = await db.exam.findUnique({
                where: { id: exam.id },
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

            return NextResponse.json(updatedExam);
        }

        return NextResponse.json(exam);
    } catch (error) {
        console.error("Failed to create exam:", error);
        // Trả về thông tin lỗi chi tiết hơn để dễ debug
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to create exam: ${errorMessage}` },
            { status: 500 }
        );
    }
}