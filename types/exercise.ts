export interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  deadline?: Date | string | null;
  files?: { id: string; name: string; url: string }[];
  model?: {
      id: string;
      name: string;
  } | null;
  field?: {
      id: string;
      name: string;
  } | null;
  channel?: {
      id: string;
      name: string;
      serverId: string;
      server?: {
          id: string;
          name: string;
      };
  } | null;
  questionCount?: number | null;
  allowReferences?: boolean;
  shuffleQuestions?: boolean;
  modelId: string;
  fieldId?: string;
}
