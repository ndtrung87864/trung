export interface Exam {
    id: string;
    name: string;
    description?: string;
    prompt?: string;
    isActive: boolean;
    modelId: string;
    fieldId?: string;
    channelId?: string;
    files: ExamFile[];
    model: {
        id: string;
        name: string;
    };
    field?: {
        id: string;
        name: string;
    };
    channel?: {
        id: string;
        name: string;
        server: {
            id: string;
            name: string;
        };
    };
    createdAt: string;
    updatedAt: string;
    deadline?: string;
    allowReferences?: boolean;
    shuffleQuestions?: boolean;
    questionCount?: number;
}

export interface ExistingFile {
    id: string;
    name: string;
    url: string;
    lastModified?: number;
    size?: number;
    type?: string;
    webkitRelativePath?: string;
}

export interface ExamFile {
    id: string;
    name: string;
    url: string;
}

export interface ChannelWithServer {
    id: string;
    name: string;
    serverId: string;
    serverName: string;
}

export interface Model {
    id: string;
    name: string;
}

export interface ExamManagementProps {
    exams?: any[];
    currentServerId?: string | "all";
    currentChannelId?: string | "all" | null;
}
