import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const user = await currentProfile();
        if (!user || user.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get system overview
        const [
            totalUsers,
            adminUsers,
            newUsersToday,
            totalServers,
            totalMembers,
            totalChannels,
            totalMessages,
            messagesToday
        ] = await Promise.all([
            db.profile.count(),
            db.profile.count({ where: { role: 'ADMIN' } }),
            db.profile.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            db.server.count(),
            db.member.count(),
            db.channel.count(),
            db.message.count(),
            db.message.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            })
        ]);

        // Get learning system data
        const [models, fields, chatboxes] = await Promise.all([
            db.model.findMany({
                include: {
                    _count: {
                        select: {
                            fields: true,
                            chatboxes: true,
                            Exam: true,
                            Exercise: true
                        }
                    }
                }
            }),
            db.field.findMany({
                include: {
                    model: { select: { name: true } },
                    _count: {
                        select: {
                            files: true,
                            chatboxes: true,
                            Exercise: true,
                            Score: true
                        }
                    }
                }
            }),
            db.chatbox.count()
        ]);

        // Get assessment data
        const [exams, exercises, examResults, exerciseResults] = await Promise.all([
            db.exam.count(),
            db.exam.count({ where: { isActive: true } }),
            db.examResult.count(),
            db.exerciseResult.count()
        ]);

        // Get System Master assistant
        const assistant = await db.systemAssistant.findFirst({
            where: { type: 'SYSTEM_MASTER' },
            include: {
                managedSessions: {
                    where: { status: 'ACTIVE' },
                    take: 10,
                    orderBy: { startedAt: 'desc' },
                    include: {
                        user: { select: { name: true } }
                    }
                },
                logs: {
                    take: 20,
                    orderBy: { timestamp: 'desc' }
                }
            }
        });

        const dashboardData = {
            overview: {
                users: {
                    total: totalUsers,
                    admins: adminUsers,
                    active24h: totalUsers, // You can calculate active users if needed
                    newToday: newUsersToday
                },
                servers: {
                    total: totalServers,
                    active: totalServers,
                    totalMembers: totalMembers
                },
                channels: {
                    total: totalChannels,
                    byType: {} // You can group by type if needed
                },
                messages: {
                    total: totalMessages,
                    today: messagesToday,
                    last7days: totalMessages // Calculate if needed
                }
            },
            learningSystem: {
                models: {
                    total: models.length,
                    active: models.filter(m => m.isActive).length,
                    data: models
                },
                fields: {
                    total: fields.length,
                    active: fields.filter(f => f.isActive).length,
                    data: fields
                },
                chatboxes: {
                    total: chatboxes,
                    byModel: {},
                    data: []
                }
            },
            assessmentSystem: {
                exams: {
                    total: exams,
                    active: exercises,
                    withDeadlines: 0,
                    data: []
                },
                exercises: {
                    total: exercises,
                    active: exercises,
                    withDeadlines: 0,
                    data: []
                },
                results: {
                    examResults,
                    exerciseResults,
                    totalParticipants: 0
                }
            },
            assistant,
            activeSessions: assistant?.managedSessions || [],
            recentLogs: assistant?.logs || []
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error("[SYSTEM_MASTER_DASHBOARD_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}