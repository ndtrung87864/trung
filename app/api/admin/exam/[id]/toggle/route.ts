import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { property } = await req.json();
        
        const exam = await db.exam.findUnique({
            where: { id: id },
        });

        if (!exam) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            );
        }        // Handle toggle for different properties
        const updateData: {
            isActive?: boolean;
            allowReferences?: boolean;
            shuffleQuestions?: boolean;
        } = {};
        
        if (property === 'isActive') {
            updateData.isActive = !exam.isActive;
        } else if (property === 'allowReferences') {
            updateData.allowReferences = !(exam.allowReferences || false);
        } else if (property === 'shuffleQuestions') {
            updateData.shuffleQuestions = !(exam.shuffleQuestions || false);
        } else {
            return NextResponse.json(
                { error: "Invalid property to toggle" },
                { status: 400 }
            );
        }        const updatedExam = await db.exam.update({
            where: { id: id },
            data: updateData,
            include: {
                model: true,
                files: true,
                channel: {
                    include: {
                        server: true
                    }
                }
            }
        });

        return NextResponse.json(updatedExam);
    } catch (error) {
        console.error("Failed to toggle exam status:", error);
        return NextResponse.json(
            { error: "Failed to toggle exam status" },
            { status: 500 }
        );
    }
}
