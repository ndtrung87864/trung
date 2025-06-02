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
        const timeRange = searchParams.get('timeRange') || '7'; // days
        const serverId = searchParams.get('serverId');

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));

        // Thống kê tổng quan
        const totalWords = await db.profanityWord.count({
            where: { isActive: true }
        });

        const totalViolations = await db.profanityViolation.count({
            where: {
                createdAt: { gte: startDate },
                ...(serverId && { serverId })
            }
        });

        // Thống kê theo mức độ nghiêm trọng
        const violationsBySeverity = await db.profanityViolation.groupBy({
            by: ['severity'],
            where: {
                createdAt: { gte: startDate },
                ...(serverId && { serverId })
            },
            _count: {
                id: true
            }
        });

        // Thống kê theo context
        const violationsByContext = await db.profanityViolation.groupBy({
            by: ['contextType'],
            where: {
                createdAt: { gte: startDate },
                ...(serverId && { serverId })
            },
            _count: {
                id: true
            }
        });

        // Top người vi phạm
        const topViolators = await db.profanityViolation.groupBy({
            by: ['userId', 'userName'],
            where: {
                createdAt: { gte: startDate },
                ...(serverId && { serverId })
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 10
        });

        // Top từ cấm được sử dụng nhiều nhất
        const topWords = await db.profanityWord.findMany({
            where: {
                isActive: true,
                usageCount: { gt: 0 }
            },
            orderBy: {
                usageCount: 'desc'
            },
            take: 10,
            select: {
                word: true,
                usageCount: true,
                category: true,
                severity: true,
                lastUsed: true
            }
        });

        // Thống kê theo thời gian (7 ngày gần nhất)
        const dailyStats = await Promise.all(
            Array.from({ length: 7 }, async (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const count = await db.profanityViolation.count({
                    where: {
                        createdAt: {
                            gte: date,
                            lt: nextDate
                        },
                        ...(serverId && { serverId })
                    }
                });

                return {
                    date: date.toISOString().split('T')[0],
                    violations: count
                };
            })
        );

        return NextResponse.json({
            overview: {
                totalWords,
                totalViolations,
                violationsBySeverity,
                violationsByContext
            },
            topViolators,
            topWords,
            dailyStats: dailyStats.reverse()
        });

    } catch (error) {
        console.error("[PROFANITY_STATS]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}