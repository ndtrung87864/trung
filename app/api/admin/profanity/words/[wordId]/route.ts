import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { profanityFilter } from "@/lib/profanity-filter";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ wordId: string }> }
) {
    try {
        const profile = await currentProfile();
        
        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { wordId } = await params;
        const { 
            category, 
            severity, 
            replacement,
            isActive 
        } = await req.json();

        if (!wordId) {
            return new NextResponse("Word ID is required", { status: 400 });
        }

        const existingWord = await db.profanityWord.findUnique({
            where: { id: wordId }
        });

        if (!existingWord) {
            return new NextResponse("Word not found", { status: 404 });
        }

        const updatedWord = await db.profanityWord.update({
            where: { id: wordId },
            data: {
                ...(category && { category }),
                ...(severity && { severity }),
                ...(replacement !== undefined && { replacement: replacement?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date()
            },
            include: {
                _count: {
                    select: {
                        violations: true
                    }
                }
            }
        });

        // Reload cache để áp dụng thay đổi
        await profanityFilter.reloadCache();

        return NextResponse.json(updatedWord);

    } catch (error) {
        console.error("[PROFANITY_WORD_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ wordId: string }> }
) {
    try {
        const profile = await currentProfile();
        
        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { wordId } = await params;

        if (!wordId) {
            return new NextResponse("Word ID is required", { status: 400 });
        }

        const existingWord = await db.profanityWord.findUnique({
            where: { id: wordId }
        });

        if (!existingWord) {
            return new NextResponse("Word not found", { status: 404 });
        }

        // Kiểm tra xem có vi phạm liên quan không
        const violationCount = await db.profanityViolation.count({
            where: {
                profanityWordId: wordId
            }
        });

        if (violationCount > 0) {
            // Soft delete: chỉ disable thay vì xóa hoàn toàn
            await db.profanityWord.update({
                where: { id: wordId },
                data: {
                    isActive: false,
                    updatedAt: new Date()
                }
            });

            // Reload cache
            await profanityFilter.reloadCache();

            return NextResponse.json({ 
                success: true, 
                message: "Word has been disabled due to existing violations" 
            });
        } else {
            // Hard delete nếu chưa có vi phạm
            await db.profanityWord.delete({
                where: { id: wordId }
            });

            // Reload cache
            await profanityFilter.reloadCache();

            return NextResponse.json({ 
                success: true, 
                message: "Word deleted successfully" 
            });
        }

    } catch (error) {
        console.error("[PROFANITY_WORD_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}