import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { profanityFilter } from "@/lib/profanity-filter";

export async function GET(req: NextRequest) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category');
        const severity = searchParams.get('severity');

        const where: any = {};

        if (search) {
            where.word = {
                contains: search,
                mode: 'insensitive'
            };
        }

        if (category && category !== 'all') where.category = category;
        if (severity && severity !== 'all') where.severity = severity;

        const words = await db.profanityWord.findMany({
            where,
            orderBy: [
                { isActive: 'desc' }, // Active words first
                { usageCount: 'desc' },
                { word: 'asc' }
            ],
            skip: (page - 1) * limit,
            take: limit,
            include: {
                _count: {
                    select: {
                        violations: true
                    }
                }
            }
        });

        const total = await db.profanityWord.count({ where });

        return NextResponse.json({
            words,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("[PROFANITY_WORDS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const {
            word,
            category = 'CUSTOM',
            severity = 'MEDIUM',
            language = 'vi',
            replacement
        } = await req.json();

        if (!word || !word.trim()) {
            return new NextResponse("Word is required", { status: 400 });
        }

        const normalizedWord = word.trim().toLowerCase();

        const existingWord = await db.profanityWord.findUnique({
            where: { word: normalizedWord }
        });

        if (existingWord) {
            return new NextResponse("Word already exists", { status: 409 });
        }

        const newWord = await db.profanityWord.create({
            data: {
                word: normalizedWord,
                category,
                severity,
                language,
                replacement: replacement?.trim() || null,
                createdBy: profile.userId,
                isActive: true
            },
            include: {
                _count: {
                    select: {
                        violations: true
                    }
                }
            }
        });

        // Reload cache để áp dụng từ mới
        await profanityFilter.reloadCache();

        return NextResponse.json(newWord);

    } catch (error) {
        console.error("[PROFANITY_WORDS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
export async function DELETE(req: NextRequest) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { id } = await req.json();

        if (!id) {
            return new NextResponse("ID is required", { status: 400 });
        }

        const word = await db.profanityWord.findUnique({ where: { id } });

        if (!word) {
            return new NextResponse("Word not found", { status: 404 });
        }

        await db.profanityWord.delete({ where: { id } });

        return NextResponse.json({ message: "Word deleted successfully" });

    } catch (error) {
        console.error("[PROFANITY_WORDS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}