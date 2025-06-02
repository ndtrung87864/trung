export type Sender = "user" | "bot";

export interface Message {
  text: string;
  sender: Sender;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}
