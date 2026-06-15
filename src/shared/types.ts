export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  id?: string;
  images?: string[];
  files?: string[];
}

export interface ScrapedConversation {
  platform: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'poe' | 'deepseek' | 'grok' | 'openwebui' | 'unknown';
  title: string;
  url: string;
  messages: Message[];
  scrapedAt: string;
}

export interface UnresolvedTask {
  text: string;
  completed: boolean;
}

export interface UserPreferences {
  coding_style: string;
  tone: string;
  custom_notes?: string;
}

export interface ConversationChunk {
  topic: string;
  summary: string;
}

export interface Capsule {
  id: string; // unique ID for storage
  version: string;
  title: string;
  platform: string;
  url: string;
  created_at: string;
  summary: string;
  current_goal: string;
  important_decisions: string[];
  user_preferences: UserPreferences;
  entities: string[];
  unresolved_tasks: UnresolvedTask[];
  conversation_chunks?: ConversationChunk[];
  messages?: Message[];
}

export interface Settings {
  openaiApiKey: string;
  geminiApiKey: string;
  defaultPromptTemplate: string;
  theme: 'light' | 'dark' | 'system';
}

export interface ScrapeStatus {
  messagesScraped: number;
  isObserving: boolean;
  lastScrapedAt: string;
}

export type ExtensionMessage =
  | { type: 'SCRAPE_CURRENT_PAGE'; payload?: never }
  | { type: 'SCRAPE_RESPONSE'; payload: ScrapedConversation }
  | { type: 'SCRAPE_ERROR'; payload: { error: string } }
  | { type: 'START_LIVE_OBSERVER'; payload?: never }
  | { type: 'STOP_LIVE_OBSERVER'; payload?: never }
  | { type: 'LIVE_UPDATE'; payload: ScrapedConversation }
  | { type: 'INJECT_CAPSULE'; payload: { prompt: string } }
  | { type: 'INJECT_RESPONSE'; payload: { success: boolean; error?: string } };
