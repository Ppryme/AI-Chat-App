export interface Message {
  id?: string;
  chat_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}
