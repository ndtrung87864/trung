import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";

export async function GET(req: Request) {
    try {
        const profile = await currentProfile();

        if (!profile || profile.role !== UserRole.ADMIN) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Lấy dữ liệu user activity
        const userActivity = await db.profile.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Lấy server statistics
        const serverStats = await db.server.findMany({
            include: {
                channels: {
                    include: {
                        exams: {
                            where: {
                                createdAt: { gte: startDate }
                            }
                        },
                        exercises: {
                            where: {
                                createdAt: { gte: startDate }
                            }
                        }
                    }
                },
                members: true
            }
        });

        // Thống kê theo ngày
        const dailyStats = await Promise.all([
            // Exam results by day
            db.examResult.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: { gte: startDate }
                },
                _count: { id: true },
                _avg: { score: true }
            }),
            // Exercise results by day  
            db.exerciseResult.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: { gte: startDate }
                },
                _count: { id: true },
                _avg: { score: true }
            })
        ]);

        return NextResponse.json({
            userActivity: {
                totalUsers: userActivity.length,
                newUsersLast30Days: userActivity.filter(u =>
                    new Date(u.createdAt) >= startDate
                ).length,
                usersByRole: {
                    ADMIN: userActivity.filter(u => u.role === UserRole.ADMIN).length,
                    USER: userActivity.filter(u => u.role === UserRole.USER).length
                }
            },
            serverStats: serverStats.map(server => ({
                id: server.id,
                name: server.name,
                memberCount: server.members.length,
                channelCount: server.channels.length,
                examCount: server.channels.reduce((sum, c) => sum + c.exams.length, 0),
                exerciseCount: server.channels.reduce((sum, c) => sum + c.exercises.length, 0)
            })),
            dailyStats: {
                exams: dailyStats[0],
                exercises: dailyStats[1]
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("[SYSTEM_ANALYTICS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}