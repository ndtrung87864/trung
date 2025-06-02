import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Check if System Master exists
        const existingSystemMaster = await prisma.systemAssistant.findFirst({
            where: { type: 'SYSTEM_MASTER' }
        });

        if (!existingSystemMaster) {
            const systemMaster = await prisma.systemAssistant.create({
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

            console.log('✅ System Master created:', systemMaster.id);
        } else {
            console.log('✅ System Master already exists');
        }
    } catch (error) {
        console.error('❌ Error creating System Master:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();