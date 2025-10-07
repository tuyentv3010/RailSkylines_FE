export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: boolean;
  error?: string;
  interrupted?: boolean;
};

export type ChatSource = {
  articleId: number;
  title: string;
  preview: string;
  thumbnail: string | null;
  score: number;
};

export type ChatConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  sources: ChatSource[];
  route?: string;
};
