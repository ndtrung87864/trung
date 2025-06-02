import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
    try {
        const profile = await currentProfile();
        
        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search');
        const userId = searchParams.get('userId');
        const severity = searchParams.get('severity');
        const contextType = searchParams.get('contextType');

        const where: any = {};
        
        if (search) {
            where.OR = [
                { userName: { contains: search, mode: 'insensitive' } },
                { originalText: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        if (userId) where.userId = userId;
        if (severity) where.severity = severity;
        if (contextType) where.contextType = contextType;

        const violations = await db.profanityViolation.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                profanityWord: {
                    select: {
                        word: true,
                        category: true
                    }
                }
            }
        });

        const total = await db.profanityViolation.count({ where });

        return NextResponse.json({
            violations,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("[PROFANITY_VIOLATIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}