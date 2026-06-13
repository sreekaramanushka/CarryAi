import type { Capsule, Message, ScrapedConversation, UnresolvedTask, UserPreferences } from '../shared/types';

/**
 * Clean transcript formatting for passing to LLMs
 */
function formatTranscript(messages: Message[]): string {
  return messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
}

/**
 * Heuristic/Rule-based local summarization when no API key is available.
 * Analyzes the text structure and keywords to extract context.
 */
export function generateHeuristicSummary(conversation: ScrapedConversation): Omit<Capsule, 'id' | 'created_at'> {
  const text = conversation.messages.map(m => m.content).join(' ');
  
  // 1. Guess current goal from the last user message
  const userMessages = conversation.messages.filter(m => m.role === 'user');
  let current_goal = 'Not identified';
  if (userMessages.length > 0) {
    const lastUserMsg = userMessages[userMessages.length - 1].content;
    const sentences = lastUserMsg.split(/[.!?]\s+/);
    current_goal = sentences[0].substring(0, 100) + (sentences[0].length > 100 ? '...' : '');
  }

  // 2. Extract entities by matching keywords
  const techKeywords = [
    'react', 'vue', 'angular', 'svelte', 'typescript', 'javascript', 'node', 'express',
    'fastify', 'python', 'django', 'flask', 'fastapi', 'golang', 'rust', 'docker', 'kubernetes',
    'tailwind', 'css', 'html', 'vite', 'webpack', 'rollup', 'chrome extension', 'manifest v3',
    'supabase', 'postgresql', 'mongodb', 'redis', 'sqlite', 'mysql', 'prisma', 'orm',
    'openai', 'gemini', 'claude', 'perplexity', 'api', 'embeddings', 'pinecone', 'indexeddb'
  ];
  
  const entitiesSet = new Set<string>();
  const lowerText = text.toLowerCase();
  
  techKeywords.forEach(keyword => {
    // Word boundary check
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(lowerText)) {
      // Capitalize first letters for visual neatness
      const formatted = keyword.split(' ')
        .map(w => w === 'css' || w === 'html' || w === 'api' || w === 'orm' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      entitiesSet.add(formatted);
    }
  });

  const entities = Array.from(entitiesSet).slice(0, 8);
  if (entities.length === 0) {
    entities.push('Web Development');
  }

  // 3. Extract unresolved tasks: search for bullet points or lists in recent messages
  const unresolved_tasks: UnresolvedTask[] = [];
  
  // Look at the last assistant message specifically for checklists or list items
  const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');
  if (assistantMessages.length > 0) {
    const lastAssistantMsg = assistantMessages[assistantMessages.length - 1].content;
    const lines = lastAssistantMsg.split('\n');
    
    lines.forEach(line => {
      // Matches markdown checkboxes like - [ ] task
      const checkboxMatch = line.match(/^-\s*\[\s*\]\s*(.+)$/);
      if (checkboxMatch) {
        unresolved_tasks.push({ text: checkboxMatch[1].trim(), completed: false });
      } else {
        // Matches numbered or standard bullet lists that mention typical task words
        const bulletMatch = line.match(/^[-*•\d+.]\s+(.+)$/);
        if (bulletMatch) {
          const content = bulletMatch[1].trim().toLowerCase();
          if (content.includes('implement') || content.includes('create') || content.includes('build') || 
              content.includes('todo') || content.includes('add') || content.includes('fix') || content.includes('write')) {
            // Clean content to not include markdown bold tags etc
            const cleanText = bulletMatch[1].replace(/[*_`]/g, '').trim();
            if (cleanText.length < 120 && unresolved_tasks.length < 5) {
              unresolved_tasks.push({ text: cleanText, completed: false });
            }
          }
        }
      }
    });
  }

  // Fallback task if none found
  if (unresolved_tasks.length === 0) {
    unresolved_tasks.push({ text: `Proceed with current goal: ${current_goal}`, completed: false });
  }

  // 4. Extract decisions
  const decisions: string[] = [];
  // Match statements implying decisions
  const decisionRegexes = [
    /we'll use ([a-zA-Z0-9\s.+]+)/gi,
    /we will use ([a-zA-Z0-9\s.+]+)/gi,
    /let's use ([a-zA-Z0-9\s.+]+)/gi,
    /decided to ([a-zA-Z0-9\s.+]+)/gi,
    /choosing ([a-zA-Z0-9\s.+]+)/gi,
    /using ([a-zA-Z0-9\s.+]+) for/gi
  ];

  conversation.messages.forEach(msg => {
    decisionRegexes.forEach(regex => {
      let match;
      while ((match = regex.exec(msg.content)) !== null) {
        const item = match[1].trim().split(/[.,]/)[0]; // take first phrase
        if (item.length > 3 && item.length < 50 && !decisions.includes(item)) {
          decisions.push(`Using ${item}`);
        }
      }
    });
  });

  // Default decisions based on entities
  entities.slice(0, 3).forEach(ent => {
    decisions.push(`Adopted ${ent} into project stack`);
  });

  const uniqueDecisions = Array.from(new Set(decisions)).slice(0, 5);

  // 5. User preferences
  const user_preferences: UserPreferences = {
    coding_style: lowerText.includes('functional') ? 'Functional, modular development' : 'Modern standard guidelines',
    tone: lowerText.includes('please') || lowerText.includes('thanks') ? 'Friendly, collaborative' : 'Professional, direct'
  };

  // 6. Project summary
  const userMsgCount = userMessages.length;
  const platformName = conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1);
  const summary = `This conversation contains ${conversation.messages.length} messages on ${platformName}. The user is discussing a development project involving ${entities.join(', ')}. Key topics discussed include resolving issues around ${current_goal}.`;

  return {
    title: conversation.title,
    platform: conversation.platform,
    url: conversation.url,
    summary,
    current_goal,
    important_decisions: uniqueDecisions,
    user_preferences,
    entities,
    unresolved_tasks,
    messages: conversation.messages
  };
}

/**
 * Summarizes the conversation using Gemini API (generateContent)
 */
async function summarizeWithGemini(transcript: string, apiKey: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const systemPrompt = `You are a professional development context generator. Analyze the developer chat transcript and output a JSON summary of the project state.
You MUST output ONLY valid JSON matching this schema:
{
  "summary": "A detailed multi-line summary of what the project is, the context, and what has been built/done so far (max 200 words)",
  "current_goal": "The active goal the user is trying to solve in this conversation right now",
  "important_decisions": [
    "Decision 1 (e.g. Using Tailwind CSS v4)",
    "Decision 2..."
  ],
  "user_preferences": {
    "coding_style": "e.g. clean React, functional, strict types",
    "tone": "e.g. professional, casual, direct",
    "custom_notes": "Any other specific preferences, instructions, or style constraints"
  },
  "entities": [
    "Frameworks, APIs, libraries, databases, and key concepts discussed"
  ],
  "unresolved_tasks": [
    { "text": "What remains to be done next", "completed": false }
  ]
}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nTranscript:\n${transcript}`
        }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('Empty response from Gemini API');
  }

  return JSON.parse(textContent);
}

/**
 * Summarizes the conversation using OpenAI API (chat/completions)
 */
async function summarizeWithOpenAI(transcript: string, apiKey: string): Promise<any> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const systemPrompt = `You are a professional development context generator. Analyze the developer chat transcript and output a JSON summary of the project state.
You MUST output ONLY valid JSON matching this schema:
{
  "summary": "A detailed multi-line summary of what the project is, the context, and what has been built/done so far (max 200 words)",
  "current_goal": "The active goal the user is trying to solve in this conversation right now",
  "important_decisions": [
    "Decision 1 (e.g. Using Tailwind CSS v4)",
    "Decision 2..."
  ],
  "user_preferences": {
    "coding_style": "e.g. clean React, functional, strict types",
    "tone": "e.g. professional, casual, direct",
    "custom_notes": "Any other specific preferences, instructions, or style constraints"
  },
  "entities": [
    "Frameworks, APIs, libraries, databases, and key concepts discussed"
  ],
  "unresolved_tasks": [
    { "text": "What remains to be done next", "completed": false }
  ]
}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summarize this chat transcript:\n\n${transcript}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  const textContent = result.choices?.[0]?.message?.content;
  if (!textContent) {
    throw new Error('Empty response from OpenAI API');
  }

  return JSON.parse(textContent);
}

/**
 * Main summarizer orchestrator.
 * Combines heuristics and AI processing.
 */
export async function generateCapsule(
  conversation: ScrapedConversation,
  apiKeys?: { openai?: string; gemini?: string }
): Promise<Capsule> {
  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const created_at = new Date().toISOString();

  // Basic Heuristics first as baseline
  const heuristicBase = generateHeuristicSummary(conversation);
  
  // If no API keys are configured, return the heuristic results immediately
  const openAiKey = apiKeys?.openai;
  const geminiKey = apiKeys?.gemini;

  if (!openAiKey && !geminiKey) {
    console.log('CarryAI: API key not detected. Using Heuristics for capsule creation.');
    return {
      id,
      created_at,
      ...heuristicBase
    };
  }

  const transcript = formatTranscript(conversation.messages);

  try {
    let aiResult: any;

    if (geminiKey) {
      console.log('CarryAI: Summarizing with Gemini API...');
      aiResult = await summarizeWithGemini(transcript, geminiKey);
    } else if (openAiKey) {
      console.log('CarryAI: Summarizing with OpenAI API...');
      aiResult = await summarizeWithOpenAI(transcript, openAiKey);
    }

    // Merge AI result with verified fallback values to guarantee no schema crashes
    return {
      id,
      version: '1.0',
      title: conversation.title || heuristicBase.title,
      platform: conversation.platform || heuristicBase.platform,
      url: conversation.url || heuristicBase.url,
      created_at,
      summary: aiResult.summary || heuristicBase.summary,
      current_goal: aiResult.current_goal || heuristicBase.current_goal,
      important_decisions: Array.isArray(aiResult.important_decisions) 
        ? aiResult.important_decisions 
        : heuristicBase.important_decisions,
      user_preferences: {
        coding_style: aiResult.user_preferences?.coding_style || heuristicBase.user_preferences.coding_style,
        tone: aiResult.user_preferences?.tone || heuristicBase.user_preferences.tone,
        custom_notes: aiResult.user_preferences?.custom_notes || ''
      },
      entities: Array.isArray(aiResult.entities) 
        ? aiResult.entities 
        : heuristicBase.entities,
      unresolved_tasks: Array.isArray(aiResult.unresolved_tasks) 
        ? aiResult.unresolved_tasks 
        : heuristicBase.unresolved_tasks,
      messages: conversation.messages
    };
  } catch (error) {
    console.error('CarryAI: AI summarization failed, falling back to heuristics.', error);
    return {
      id,
      created_at,
      version: '1.0',
      ...heuristicBase
    };
  }
}
