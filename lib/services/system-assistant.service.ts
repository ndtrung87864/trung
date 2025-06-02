import { db } from "@/lib/db";
import { SystemAssistantType, AssistantStatus, LogLevel, SessionType, SessionStatus } from "@prisma/client";
import { GeminiService } from "./gemini.service";

export class SystemAssistantService {
    // Tạo System Master Assistant
    static async createSystemMaster() {
        return await db.systemAssistant.create({
            data: {
                name: "System Master",
                description: "Master assistant for comprehensive system management",
                type: SystemAssistantType.SYSTEM_MASTER,
                status: AssistantStatus.ACTIVE,
                capabilities: {
                    monitoring: ["performance", "database", "memory", "cpu", "disk"],
                    analytics: ["user_behavior", "system_usage", "performance_trends"],
                    maintenance: ["cleanup", "optimization", "backup"],
                    notifications: ["alerts", "reports", "recommendations"],
                    management: ["user_management", "content_moderation", "system_config"]
                },
                config: {
                    checkInterval: 300, // 5 minutes
                    reportInterval: 3600, // 1 hour
                    alertThresholds: {
                        memory: 80,
                        cpu: 90,
                        disk: 85,
                        responseTime: 1000,
                        errorRate: 5
                    },
                    features: {
                        autoCleanup: true,
                        smartAlerts: true,
                        performanceOptimization: true,
                        userAnalytics: true
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

    // Lấy System Master Assistant
    static async getSystemMaster() {
        return await db.systemAssistant.findFirst({
            where: {
                type: SystemAssistantType.SYSTEM_MASTER,
                status: AssistantStatus.ACTIVE
            },
            include: {
                managedSessions: {
                    where: { status: SessionStatus.ACTIVE },
                    take: 10,
                    orderBy: { startedAt: 'desc' }
                },
                logs: {
                    take: 20,
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
    }

    // Bắt đầu session với System Master
    static async startSystemSession(userId: string, sessionType: SessionType, metadata?: any) {
        const systemMaster = await this.getSystemMaster();
        if (!systemMaster) {
            throw new Error("System Master assistant not found");
        }

        const session = await db.systemSession.create({
            data: {
                type: sessionType,
                userId,
                assistantId: systemMaster.id,
                status: SessionStatus.ACTIVE,
                metadata: metadata || {}
            },
            include: {
                assistant: true,
                user: true
            }
        });

        // Log session start
        await this.createLog(
            systemMaster.id,
            LogLevel.INFO,
            "SESSION_STARTED",
            {
                sessionId: session.id,
                sessionType,
                userId
            },
            userId
        );

        return session;
    }

    // Thêm message vào session
    static async addSystemMessage(sessionId: string, role: import("@prisma/client").MessageRole, content: string) {
        return await db.systemMessage.create({
            data: {
                sessionId,
                role,
                content
            }
        });
    }

    // Ghi log hệ thống
    static async createLog(assistantId: string, level: LogLevel, action: string, details: any, userId?: string) {
        return await db.systemLog.create({
            data: {
                assistantId,
                level,
                action,
                details,
                userId
            }
        });
    }

    // Phân tích tổng quan hệ thống
    static async getSystemOverview() {
        const [
            totalUsers,
            adminUsers,
            activeUsers24h,
            newUsersToday,
            totalServers,
            activeServers,
            totalMembers,
            totalChannels,
            totalMessages,
            messagesToday,
            messages7days
        ] = await Promise.all([
            // Users
            db.profile.count(),
            db.profile.count({ where: { role: 'ADMIN' } }),
            db.profile.count({
                where: {
                    updatedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            }),
            db.profile.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            // Servers
            db.server.count(),
            db.server.count(),
            db.member.count(),
            // Channels & Messages
            db.channel.count(),
            db.message.count(),
            db.message.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            db.message.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        // Channel types
        const channelsByType = await db.channel.groupBy({
            by: ['type'],
            _count: { type: true }
        });

        return {
            users: {
                total: totalUsers,
                admins: adminUsers,
                active24h: activeUsers24h,
                newToday: newUsersToday
            },
            servers: {
                total: totalServers,
                active: activeServers,
                totalMembers: totalMembers
            },
            channels: {
                total: totalChannels,
                byType: channelsByType.reduce((acc, item) => {
                    acc[item.type] = item._count.type;
                    return acc;
                }, {} as Record<string, number>)
            },
            messages: {
                total: totalMessages,
                today: messagesToday,
                last7days: messages7days
            }
        };
    }

    // Phân tích hệ thống học tập
    static async getLearningSystemData() {
        const [models, fields, files, chatboxes] = await Promise.all([
            // Models
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
            // Fields
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
            // Files
            db.file.findMany({
                include: {
                    field: { select: { name: true } }
                }
            }),
            // Chatboxes
            db.chatbox.findMany({
                include: {
                    model: { select: { name: true } },
                    field: { select: { name: true } }
                }
            })
        ]);

        return {
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
            files: {
                total: files.length,
                totalSize: 0, // Calculate if you have size field
                byField: files.reduce((acc, file) => {
                    acc[file.field.name] = (acc[file.field.name] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                data: files
            },
            chatboxes: {
                total: chatboxes.length,
                byModel: chatboxes.reduce((acc, chat) => {
                    acc[chat.model.name] = (acc[chat.model.name] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                data: chatboxes
            }
        };
    }

    // Phân tích hệ thống đánh giá
    static async getAssessmentSystemData() {
        const [exams, exercises, examResults, exerciseResults] = await Promise.all([
            db.exam.findMany({
                include: {
                    model: { select: { name: true } },
                    channel: {
                        select: {
                            name: true,
                            server: { select: { name: true } }
                        }
                    },
                    _count: {
                        select: {
                            examResults: true,
                            files: true
                        }
                    }
                }
            }),
            db.exercise.findMany({
                include: {
                    model: { select: { name: true } },
                    field: { select: { name: true } },
                    channel: {
                        select: {
                            name: true,
                            server: { select: { name: true } }
                        }
                    },
                    _count: {
                        select: {
                            exerciseResults: true,
                            files: true
                        }
                    }
                }
            }),
            db.examResult.count(),
            db.exerciseResult.count()
        ]);

        const uniqueParticipants = new Set([
            ...(await db.examResult.findMany({ select: { userId: true } })).map(r => r.userId),
            ...(await db.exerciseResult.findMany({ select: { userId: true } })).map(r => r.userId)
        ]);

        return {
            exams: {
                total: exams.length,
                active: exams.filter(e => e.isActive).length,
                withDeadlines: exams.filter(e => e.deadline).length,
                data: exams
            },
            exercises: {
                total: exercises.length,
                active: exercises.filter(e => e.isActive).length,
                withDeadlines: exercises.filter(e => e.deadline).length,
                data: exercises
            },
            results: {
                examResults,
                exerciseResults,
                totalParticipants: uniqueParticipants.size
            }
        };
    }

    // Cập nhật metrics của System Master
    static async updateSystemMasterMetrics(assistantId: string, metrics: any) {
        return await db.systemAssistant.update({
            where: { id: assistantId },
            data: {
                metrics,
                updatedAt: new Date()
            }
        });
    }

    // Tạo phản hồi thông minh với Gemini
    static async generateIntelligentResponse(
        userMessage: string,
        sessionId: string
    ): Promise<string> {
        try {
            // Lấy context hệ thống
            const systemContext = await this.getSystemContext();

            // Sử dụng Gemini để tạo phản hồi
            const response = await GeminiService.generateSystemMasterResponse(
                userMessage,
                systemContext
            );

            // Log interaction
            const systemMaster = await this.getSystemMaster();
            if (systemMaster) {
                await this.createLog(
                    systemMaster.id,
                    LogLevel.INFO,
                    "AI_RESPONSE_GENERATED",
                    {
                        sessionId,
                        userMessage: userMessage.substring(0, 100),
                        responseLength: response.length,
                        usedAI: true
                    }
                );
            }

            return response;
        } catch (error) {
            console.error("Error generating intelligent response:", error);
            return this.getFallbackResponse(userMessage);
        }
    }

    // Lấy context hệ thống cho AI
    private static async getSystemContext() {
        const [overview, learningData, assessmentData] = await Promise.all([
            this.getSystemOverview(),
            this.getLearningSystemData(),
            this.getAssessmentSystemData()
        ]);

        return {
            // User data
            totalUsers: overview.users.total,
            newUsersToday: overview.users.newToday,
            activeUsers24h: overview.users.active24h,
            adminUsers: overview.users.admins,

            // Server data
            totalServers: overview.servers.total,
            totalMembers: overview.servers.totalMembers,

            // Message data
            totalMessages: overview.messages.total,
            messagesToday: overview.messages.today,
            messages7days: overview.messages.last7days,

            // Learning system
            totalModels: learningData.models.total,
            activeModels: learningData.models.active,
            totalFields: learningData.fields.total,
            activeFields: learningData.fields.active,
            totalChatboxes: learningData.chatboxes.total,

            // Assessment system
            totalExams: assessmentData.exams.total,
            activeExams: assessmentData.exams.active,
            totalExercises: assessmentData.exercises.total,
            activeExercises: assessmentData.exercises.active,
            examResults: assessmentData.results.examResults,
            exerciseResults: assessmentData.results.exerciseResults,
            totalParticipants: assessmentData.results.totalParticipants
        };
    }

    // Phản hồi dự phòng khi AI không khả dụng
    private static getFallbackResponse(userMessage: string): string {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('help') || lowerMessage.includes('giúp')) {
            return `🤖 **System Master Assistant** (Chế độ cơ bản)

📊 **Thống kê hệ thống:**
- \`users\` - Thông tin người dùng
- \`servers\` - Thông tin server
- \`messages\` - Thống kê tin nhắn
- \`learning\` - Hệ thống học tập
- \`exams\` - Bài thi và bài tập
- \`status\` - Tổng quan hệ thống

💡 **Lưu ý:** Đang sử dụng chế độ fallback. Hãy kiểm tra cấu hình Gemini API.`;
        }

        return `🤖 **System Master Assistant**

⚠️ Đang hoạt động ở chế độ cơ bản (Gemini AI không khả dụng).

Gõ \`help\` để xem các lệnh hỗ trợ hoặc liên hệ quản trị viên để cấu hình API key.`;
    }

    // Tạo báo cáo phân tích tự động
    static async generateSystemAnalysisReport(): Promise<string> {
        try {
            const [overview, learningData, assessmentData] = await Promise.all([
                this.getSystemOverview(),
                this.getLearningSystemData(),
                this.getAssessmentSystemData()
            ]);

            const systemData = {
                overview,
                learningSystem: learningData,
                assessmentSystem: assessmentData,
                timestamp: new Date().toISOString()
            };

            return await GeminiService.generateSystemAnalysis(systemData);
        } catch (error) {
            console.error("Error generating analysis report:", error);
            return "⚠️ Không thể tạo báo cáo phân tích. Vui lòng thử lại sau.";
        }
    }

    // Tạo khuyến nghị cải thiện hệ thống
    static async generateSystemRecommendations(): Promise<string> {
        try {
            const overview = await this.getSystemOverview();

            const userActivity = {
                totalUsers: overview.users.total,
                newUsersToday: overview.users.newToday,
                activeUsers24h: overview.users.active24h,
                messagesPerDay: overview.messages.today,
                growth: overview.users.newToday > 0 ? "positive" : "neutral"
            };

            const systemPerformance = {
                totalServers: overview.servers.total,
                totalMembers: overview.servers.totalMembers,
                averageMembersPerServer: Math.round(overview.servers.totalMembers / overview.servers.total),
                messageVolume: overview.messages.total,
                channelCount: overview.channels.total
            };

            return await GeminiService.generateRecommendations(userActivity, systemPerformance);
        } catch (error) {
            console.error("Error generating recommendations:", error);
            return "⚠️ Không thể tạo khuyến nghị. Vui lòng thử lại sau.";
        }
    }
}