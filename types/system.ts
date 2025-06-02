// types/system.ts
export interface SystemOverview {
    users: {
        total: number;
        admins: number;
        active24h: number;
        newToday: number;
    };
    servers: {
        total: number;
        active: number;
        totalMembers: number;
    };
    channels: {
        total: number;
        byType: Record<string, number>;
    };
    messages: {
        total: number;
        today: number;
        last7days: number;
    };
}

export interface LearningSystemData {
    models: {
        total: number;
        active: number;
        data: Array<{
            id: string;
            name: string;
            isActive: boolean;
            createdAt: string;
            _count: {
                fields: number;
                Chatbox: number;
                Exam: number;
                Exercise: number;
            };
        }>;
    };
    fields: {
        total: number;
        active: number;
        data: Array<{
            id: string;
            name: string;
            description?: string;
            isActive: boolean;
            model: { name: string };
            _count: {
                files: number;
                chatboxes: number;
                exercises: number;
                Score: number;
            };
        }>;
    };
    files: {
        total: number;
        totalSize: number;
        byField: Record<string, number>;
        data: Array<{
            id: string;
            name: string;
            url: string;
            field: { name: string };
            createdAt: string;
        }>;
    };
    chatboxes: {
        total: number;
        byModel: Record<string, number>;
        data: Array<{
            id: string;
            title: string;
            model: { name: string };
            field: { name: string };
            createdAt: string;
        }>;
    };
}

export interface AssessmentSystemData {
    exams: {
        total: number;
        active: number;
        withDeadlines: number;
        data: Array<{
            id: string;
            name: string;
            description?: string;
            isActive: boolean;
            deadline?: string;
            model: { name: string };
            channel?: { name: string; server: { name: string } };
            _count: {
                examResults: number;
                files: number;
            };
        }>;
    };
    exercises: {
        total: number;
        active: number;
        withDeadlines: number;
        data: Array<{
            id: string;
            name: string;
            description?: string;
            isActive: boolean;
            deadline?: string;
            model: { name: string };
            field?: { name: string };
            channel?: { name: string; server: { name: string } };
            _count: {
                exerciseResults: number;
                files: number;
            };
        }>;
    };
    results: {
        examResults: number;
        exerciseResults: number;
        totalParticipants: number;
    };
}

export interface AnalyticsData {
    scores: {
        examScores: Array<{
            id: string;
            score: number;
            userName: string;
            examName: string;
            createdAt: string;
        }>;
        exerciseScores: Array<{
            id: string;
            score: number;
            userName: string;
            exerciseName: string;
            createdAt: string;
        }>;
        averages: {
            examAverage: number;
            exerciseAverage: number;
            overallAverage: number;
        };
        trends: {
            last7days: number[];
            last30days: number[];
        };
    };
    performance: {
        topModels: Array<{ name: string; avgScore: number; count: number }>;
        topFields: Array<{ name: string; avgScore: number; count: number }>;
        topServers: Array<{ name: string; activity: number; members: number }>;
    };
    usage: {
        dailyActivity: Array<{ date: string; users: number; actions: number }>;
        featureUsage: {
            exams: number;
            exercises: number;
            chatboxes: number;
            fileUploads: number;
        };
    };
}

export interface SystemHealthData {
    database: {
        connected: boolean;
        responseTime: number;
        activeConnections: number;
    };
    performance: {
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
    };
    errors: Array<{
        level: string;
        action: string;
        count: number;
        lastOccurrence: string;
    }>;
    systemLogs: Array<{
        level: string;
        action: string;
        details: any;
        timestamp: string;
        user?: { name: string };
    }>;
}

export interface ComprehensiveSystemData {
    overview: SystemOverview;
    learningSystem: LearningSystemData;
    assessmentSystem: AssessmentSystemData;
    analytics: AnalyticsData;
    systemHealth: SystemHealthData;
    meta: {
        timestamp: string;
        queryDuration: number;
        dataFreshness: string;
        totalQueries: number;
    };
}