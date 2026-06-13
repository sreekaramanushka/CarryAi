import type { Message, ScrapedConversation } from '../shared/types';

export interface PlatformAdapter {
  name: string;
  detect(url: string): boolean;
  parse(document: Document): Message[];
}

const ChatGPTAdapter: PlatformAdapter = {
  name: 'chatgpt',
  detect: (url) => url.includes('chatgpt.com'),
  parse: (doc) => {
    const messages: Message[] = [];
    const elements = doc.querySelectorAll('div[data-message-author-role]');
    
    elements.forEach((el) => {
      const roleAttr = el.getAttribute('data-message-author-role');
      if (roleAttr === 'user' || roleAttr === 'assistant') {
        // Look for the markdown container inside
        const contentEl = el.querySelector('.markdown') || el;
        // Strip out some ChatGPT specific elements if needed
        const content = contentEl.textContent?.trim() || '';
        if (content) {
          messages.push({ role: roleAttr, content });
        }
      }
    });

    return messages;
  }
};

const ClaudeAdapter: PlatformAdapter = {
  name: 'claude',
  detect: (url) => url.includes('claude.ai'),
  parse: (doc) => {
    const messages: Message[] = [];
    
    // Select user messages and assistant messages
    // Claude uses testids like data-testid="user-message" and data-testid="assistant-message"
    const elements = doc.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"], .font-claude-message, .font-user-message');
    
    if (elements.length > 0) {
      elements.forEach((el) => {
        const testId = el.getAttribute('data-testid');
        let role: 'user' | 'assistant' = 'assistant';
        
        if (testId === 'user-message' || el.classList.contains('font-user-message')) {
          role = 'user';
        } else if (testId === 'assistant-message' || el.classList.contains('font-claude-message')) {
          role = 'assistant';
        }
        
        const content = el.textContent?.trim() || '';
        if (content) {
          messages.push({ role, content });
        }
      });
    } else {
      // Fallback selector for Claude's conversation turns
      const bubbleElements = doc.querySelectorAll('.font-user, .font-claude');
      bubbleElements.forEach((el) => {
        const role = el.classList.contains('font-user') ? 'user' : 'assistant';
        const content = el.textContent?.trim() || '';
        if (content) {
          messages.push({ role, content });
        }
      });
    }
    
    return messages;
  }
};

const GeminiAdapter: PlatformAdapter = {
  name: 'gemini',
  detect: (url) => url.includes('gemini.google.com'),
  parse: (doc) => {
    const messages: Message[] = [];
    // User query starts with <user-query>, Model answers start with <message-content> inside .model-turn
    const elements = doc.querySelectorAll('user-query, message-content, .message-content, .query-text');
    
    elements.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      let role: 'user' | 'assistant' = 'assistant';
      
      if (tagName === 'user-query' || el.classList.contains('query-text')) {
        role = 'user';
      }
      
      // Filter out copy buttons, share buttons etc inside the bubble if any
      const content = el.textContent?.trim() || '';
      if (content) {
        messages.push({ role, content });
      }
    });
    
    return messages;
  }
};

const PerplexityAdapter: PlatformAdapter = {
  name: 'perplexity',
  detect: (url) => url.includes('perplexity.ai'),
  parse: (doc) => {
    const messages: Message[] = [];
    
    // Perplexity alternating bubble containers
    // User questions are typically simple text containers
    // Assistant replies are in Markdown/prose containers
    const containers = doc.querySelectorAll('div.default.font-sans, div.prose, .markdown, [data-testid="user-query"]');
    
    containers.forEach((el) => {
      const isUser = el.getAttribute('data-testid') === 'user-query' || 
                     el.closest('[data-testid="user-query"]') !== null ||
                     el.classList.contains('user-query');
      
      const role = isUser ? 'user' : 'assistant';
      const content = el.textContent?.trim() || '';
      if (content) {
        messages.push({ role, content });
      }
    });

    // Fallback: search for alternating query blocks and response blocks
    if (messages.length === 0) {
      const allTextDivs = doc.querySelectorAll('.font-sans');
      allTextDivs.forEach((el) => {
        if (el.classList.contains('text-2xl') || el.classList.contains('font-semibold')) {
          const content = el.textContent?.trim() || '';
          if (content && content.length < 500) { // Limit query length guess
            messages.push({ role: 'user', content });
          }
        }
      });
    }
    
    return messages;
  }
};

const PoeAdapter: PlatformAdapter = {
  name: 'poe',
  detect: (url) => url.includes('poe.com'),
  parse: (doc) => {
    const messages: Message[] = [];
    // User bubble class: Message_messageBubbleUser__xxxx
    // Assistant bubble class: Message_messageBubble__xxxx
    const bubbles = doc.querySelectorAll('[class*="Message_messageBubble__"], [class*="messageBubbleUser"]');
    
    bubbles.forEach((el) => {
      const className = el.className;
      const isUser = className.includes('messageBubbleUser') || className.includes('User');
      const role = isUser ? 'user' : 'assistant';
      const content = el.textContent?.trim() || '';
      if (content) {
        messages.push({ role, content });
      }
    });
    
    return messages;
  }
};

const DeepSeekAdapter: PlatformAdapter = {
  name: 'deepseek',
  detect: (url) => url.includes('deepseek.com'),
  parse: (doc) => {
    const messages: Message[] = [];
    // DeepSeek classes: user messages vs assistant markdown
    // Often user input layout is: .f77d337d (dynamic) but text areas are in containers.
    // Assistant markdown: .ds-markdown
    const elements = doc.querySelectorAll('.ds-markdown, [class*="user-message"], [class*="chat-message"]');
    
    elements.forEach((el) => {
      // If it has markdown or specific roles
      const isUser = el.closest('[class*="user-"]') !== null || el.className.includes('user');
      const role = isUser ? 'user' : 'assistant';
      const content = el.textContent?.trim() || '';
      if (content) {
        messages.push({ role, content });
      }
    });

    // Alternate selector based on message classes
    if (messages.length === 0) {
      const chatItems = doc.querySelectorAll('[class*="message"]');
      chatItems.forEach((el) => {
        const isUser = el.className.includes('user') || el.innerHTML.includes('user');
        const role = isUser ? 'user' : 'assistant';
        const content = el.textContent?.trim() || '';
        if (content) {
          messages.push({ role, content });
        }
      });
    }
    
    return messages;
  }
};

const OpenWebUIAdapter: PlatformAdapter = {
  name: 'openwebui',
  detect: (url) => url.includes('localhost:3000') || url.includes('localhost:8080') || url.includes('chat') || url.includes('ollama'),
  parse: (doc) => {
    const messages: Message[] = [];
    
    // Open WebUI / Ollama WebUI selectors
    const turns = doc.querySelectorAll('.chat-message, [data-role], .message-content, .user-message');
    
    turns.forEach((el) => {
      const dataRole = el.getAttribute('data-role');
      let role: 'user' | 'assistant' = 'assistant';
      
      if (dataRole === 'user' || el.classList.contains('user-message') || el.className.includes('user')) {
        role = 'user';
      }
      
      const contentEl = el.querySelector('.prose, .markdown') || el;
      const content = contentEl.textContent?.trim() || '';
      if (content) {
        messages.push({ role, content });
      }
    });
    
    return messages;
  }
};

// List of all adapters ordered by specificity
const adapters: PlatformAdapter[] = [
  ChatGPTAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  PerplexityAdapter,
  PoeAdapter,
  DeepSeekAdapter,
  OpenWebUIAdapter
];

export function getAdapterForUrl(url: string): PlatformAdapter | null {
  for (const adapter of adapters) {
    if (adapter.detect(url)) {
      return adapter;
    }
  }
  return null;
}

export function parseConversation(url: string, document: Document): ScrapedConversation {
  const adapter = getAdapterForUrl(url);
  const messages = adapter ? adapter.parse(document) : [];
  
  // Extract Title from page heading or page title
  let title = document.title || 'AI Chat Session';
  // Strip common suffixes
  title = title
    .replace(' - ChatGPT', '')
    .replace(' - Claude', '')
    .replace(' - Gemini', '')
    .replace(' - Perplexity', '')
    .replace(' - Poe', '')
    .replace('DeepSeek', '')
    .trim();
  
  // Heuristic: If title is generic, use the first 6 words of the first user message
  if ((title === 'ChatGPT' || title === 'Claude' || title === 'Gemini' || title === 'New Chat' || title === 'AI Chat Session') && messages.length > 0) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const words = firstUserMsg.content.split(/\s+/).slice(0, 6).join(' ');
      title = words + (firstUserMsg.content.split(/\s+/).length > 6 ? '...' : '');
    }
  }
  
  const platform = adapter ? (adapter.name as ScrapedConversation['platform']) : 'unknown';
  
  return {
    platform,
    title,
    url,
    messages,
    scrapedAt: new Date().toISOString()
  };
}
