import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const user = await currentProfile();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { type = 'SYSTEM_MANAGEMENT', metadata } = await req.json();

        // Get or create System Master assistant
        let systemMaster = await db.systemAssistant.findFirst({
            where: { type: 'SYSTEM_MASTER' }
        });

        if (!systemMaster) {
            // Create System Master if not exists
            systemMaster = await db.systemAssistant.create({
                data: {
                    name: "System Master",
                    description: "Master assistant for comprehensive system management",
                    type: 'SYSTEM_MASTER',
                    status: 'ACTIVE',
                    capabilities: {
                        monitoring: ["performance", "database", "memory", "cpu", "disk"],
                        analytics: ["user_behavior", "system_usage", "performance_trends"],
                        maintenance: ["cleanup", "optimization", "backup"],
                        notifications: ["alerts", "reports", "recommendations"],
                        management: ["user_management", "content_moderation", "system_config"]
                    },
                    config: {
                        checkInterval: 300,
                        reportInterval: 3600,
                        alertThresholds: {
                            memory: 80,
                            cpu: 90,
                            disk: 85,
                            responseTime: 1000,
                            errorRate: 5
                        }
                    },
                    metrics: {
                        sessionsHandled: 0,
                        alertsSent: 0,
                        tasksCompleted: 0,
                        uptime: 0
                    }
                }
            });
        }

        // Create new session
        const session = await db.systemSession.create({
            data: {
                type: type as any, // Cast to appropriate type
                userId: user.id,
                assistantId: systemMaster.id,
                status: 'ACTIVE',
                metadata: metadata || {}
            },
            include: {
                assistant: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Add welcome message
        await db.systemMessage.create({
            data: {
                sessionId: session.id,
                role: 'ASSISTANT',
                content: `Xin chào ${user.name}! Tôi là System Master assistant. Tôi có thể giúp bạn giám sát và quản lý hệ thống LMS. Bạn muốn biết thông tin gì về hệ thống?`
            }
        });

        // Log session creation
        await db.systemLog.create({
            data: {
                assistantId: systemMaster.id,
                level: 'INFO',
                action: 'SESSION_STARTED',
                details: {
                    sessionId: session.id,
                    sessionType: type,
                    userId: user.id,
                    userName: user.name
                },
                userId: user.id
            }
        });

        // Update assistant metrics
        await db.systemAssistant.update({
            where: { id: systemMaster.id },
            data: {
                metrics: {
                    ...systemMaster.metrics as any,
                    sessionsHandled: ((systemMaster.metrics as any)?.sessionsHandled || 0) + 1
                }
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error("[SYSTEM_MASTER_CHAT_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}