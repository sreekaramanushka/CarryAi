import React, { useEffect, useState } from 'react';
import type { ScrapedConversation, Capsule } from '../../shared/types';
import { generateCapsule, generateHeuristicSummary } from '../../capsule/summarizer';
import { buildRestorationPrompt, triggerCapsuleDownload } from '../../capsule/exporter';
import { Eye, Plus, Trash2, Cpu, FileText, CheckCircle, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

// Official SVG Logos for AI Chatbots
const ChatGPTLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="#10a37f" className="w-5 h-5">
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  </svg>
);

const ClaudeLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="#d97757" className="w-5 h-5">
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
  </svg>
);

const GeminiLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <defs>
      <linearGradient id="gemini-grad-val-extension" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285f4" />
        <stop offset="30%" stopColor="#9b72cb" />
        <stop offset="70%" stopColor="#d96a70" />
        <stop offset="100%" stopColor="#e6a15c" />
      </linearGradient>
    </defs>
    <path d="M20.616 10.835a14.147 14.147 0 0 1-4.45-3.001 14.111 14.111 0 0 1-3.678-6.452.503.503 0 0 0-.975 0 14.134 14.134 0 0 1-3.679 6.452 14.155 14.155 0 0 1-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 0 0 0 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 0 1 4.45 3.001 14.112 14.112 0 0 1 3.679 6.453.502.502 0 0 0 .975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 0 1 3.001-4.45 14.113 14.113 0 0 1 6.453-3.678.503.503 0 0 0 0-.975 13.245 13.245 0 0 1-2.003-.678z" fill="url(#gemini-grad-val-extension)"></path>
  </svg>
);

const GrokLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cream-text">
    <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 0 0-1.829-1A8.975 8.975 0 0 0 5.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"></path>
  </svg>
);

const PerplexityLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="#22808a" className="w-5 h-5">
    <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" />
  </svg>
);

const PoeLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="#b92b27" className="w-5 h-5">
    <path d="M20.708 6.876a1.412 1.412 0 0 0-1.029-.415h-.006a2.019 2.019 0 0 1-2.02-2.023A1.415 1.415 0 0 0 16.254 3H4.871A1.412 1.412 0 0 0 3.47 4.434a2.026 2.026 0 0 1-2.025 2.025v.002A1.414 1.414 0 0 0 0 7.883v3.642a1.414 1.414 0 0 0 1.444 1.42 2.025 2.025 0 0 1 2.025 2.02v3.693a.5.5 0 0 0.89.313l2.051-2.567h9.843a1.412 1.412 0 0 0 1.4-1.434v-.002c0-1.12.904-2.025 2.026-2.025a1.412 1.412 0 0 0 1.446-1.42V7.88c0-.363-.14-.727-.417-1.005zm-2.42 4.687a2.025 2.025 0 0 1-2.025 2.005H4.861a2.025 2.025 0 0 1-2.025-2.005v-3.72A2.026 2.026 0 0 1 4.86 5.838h11.4a2.026 2.026 0 0 1 2.026 2.005v3.72h.002z"/><path d="M7.413 7.57A1.422 1.422 0 0 0 5.99 8.99v1.422a1.422 1.422 0 1 0 2.844 0V8.99c0-.784-.636-1.422-1.422-1.422zm6.297 0a1.422 1.422 0 0 0-1.422 1.421v1.422a1.422 1.422 0 1 0 2.844 0V8.99c0-.784-.636-1.422-1.422-1.422z"/><path d="M7.292 22.643l1.993-2.492h9.844a1.413 1.413 0 0 0 1.4-1.434 2.025 2.025 0 0 1 2.017-2.027h.01A1.409 1.409 0 0 0 24 15.27v-3.594c0-.344-.113-.68-.324-.951l-.397-.519v4.127a1.415 1.415 0 0 1-1.444 1.42h-.007a2.026 2.026 0 0 0-2.018 2.025 1.415 1.415 0 0 1-1.402 1.436H8.565l-2.169 2.712a.574.574 0 0 0.896.715v.002z"/><path d="M5.004 19.992l2.12-2.65h9.844a1.414 1.414 0 0 0 1.402-1.437c0-1.116.9-2.021 2.014-2.025h.012a1.413 1.413 0 0 0 1.443-1.422v-4.13l.52.68c.21.273.324.607.324.95v3.594a1.416 1.416 0 0 1-1.443 1.42h-.01a2.026 2.026 0 0 0-2.016 2.026 1.414 1.414 0 0 1-1.402 1.435H7.97l-1.916 2.4a.671.671 0 0 1-1.049-.839v-.002z" />
  </svg>
);

const DeepSeekLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="#0050ff" className="w-5 h-5">
    <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 11.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1.415-.287.302.302 0 0 1.2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
  </svg>
);

const LocalLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cream-text" style={{ color: 'var(--brand)' }}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

interface ActiveChatTabProps {
  onCapsuleSaved: () => void;
}

export const ActiveChatTab: React.FC<ActiveChatTabProps> = ({ onCapsuleSaved }) => {
  const [conversation, setConversation] = useState<ScrapedConversation | null>(null);
  const [isObserving, setIsObserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable Capsule State overrides
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [decisions, setDecisions] = useState<string[]>([]);
  const [newDecision, setNewDecision] = useState('');
  const [styleNotes, setStyleNotes] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<'html' | 'markdown' | 'json' | 'capsule'>('html');

  const getApiKeys = (): Promise<{ openai: string; gemini: string }> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['openaiApiKey', 'geminiApiKey'], (res) => {
          resolve({
            openai: res.openaiApiKey || '',
            gemini: res.geminiApiKey || ''
          });
        });
      } else {
        resolve({ openai: '', gemini: '' });
      }
    });
  };

  const connectToActiveTab = () => {
    setError(null);
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setError("Extension environment not available.");
      setConversation({
        platform: 'chatgpt',
        title: 'CarryAI Extension Design',
        url: 'https://chatgpt.com/c/mock-id',
        scrapedAt: new Date().toISOString(),
        messages: [
          { role: 'user', content: 'Let\'s build a Chrome extension. We will use Manifest V3, React, and Tailwind CSS.' },
          { role: 'assistant', content: 'That sounds like a great stack! Let\'s build a beautiful aesthetic.' }
        ]
      });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        setError("Could not identify active tab.");
        return;
      }

      const url = activeTab.url || '';
      const matched = ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'poe.com', 'deepseek.com', 'grok.com', 'localhost:3000', 'localhost:8080'].some(p => url.includes(p));

      if (!matched) {
        setError("Navigate to a supported AI client (ChatGPT, Claude, Gemini, Perplexity, Poe, DeepSeek, Grok) to scrape.");
        return;
      }

      const tabId = activeTab.id;
      chrome.tabs.sendMessage(tabId, { type: 'START_LIVE_OBSERVER' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('CarryAI: Content script not active. Injecting programmatically...');
          if (chrome.scripting) {
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            }, () => {
              if (chrome.runtime.lastError) {
                console.error('CarryAI: Script injection failed', chrome.runtime.lastError);
                setError("Scraper script not active. Please reload the AI chat page to initialize CarryAI.");
                return;
              }
              // Wait 150ms for script initialization, then message again
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { type: 'START_LIVE_OBSERVER' }, (secondResponse) => {
                   if (chrome.runtime.lastError) {
                     setError("Failed to connect scraper. Please reload the AI chat page manually.");
                   } else if (secondResponse && secondResponse.payload) {
                     setConversation(secondResponse.payload);
                     setIsObserving(true);
                   }
                });
              }, 150);
            });
          } else {
            setError("Scraper script not active. Please reload the AI chat page to initialize CarryAI.");
          }
          return;
        }

        if (response && response.payload) {
          setConversation(response.payload);
          setIsObserving(true);
        }
      });
    });
  };

  useEffect(() => {
    connectToActiveTab();

    const handleMessage = (message: any) => {
      if (message.type === 'LIVE_UPDATE' && message.payload) {
        setConversation(message.payload);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []);

  useEffect(() => {
    if (conversation) {
      const heuristics = generateHeuristicSummary(conversation);
      
      if (!title) {
        setTitle(heuristics.title || conversation.title || '');
      }
      if (!goal) {
        setGoal(heuristics.current_goal || '');
      }
      if (decisions.length === 0 && heuristics.important_decisions.length > 0) {
        setDecisions(heuristics.important_decisions);
      }
      if (tasks.length === 0 && heuristics.unresolved_tasks.length > 0) {
        setTasks(heuristics.unresolved_tasks.map(t => t.text));
      }
      if (!styleNotes && heuristics.user_preferences?.coding_style) {
        setStyleNotes(heuristics.user_preferences.coding_style);
      }
    }
  }, [conversation]);

  const addDecision = () => {
    if (newDecision.trim()) {
      setDecisions([...decisions, newDecision.trim()]);
      setNewDecision('');
    }
  };

  const removeDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const getLatestConversation = (): Promise<ScrapedConversation> => {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        resolve(conversation!);
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          resolve(conversation!);
          return;
        }
        chrome.tabs.sendMessage(activeTab.id, { type: 'SCRAPE_CURRENT_PAGE' }, (response) => {
          if (chrome.runtime.lastError || !response || !response.payload) {
            console.log('CarryAI: Fallback to existing conversation state.');
            resolve(conversation!);
          } else {
            console.log('CarryAI: Retrieved latest scrape for capsule synthesis.');
            resolve(response.payload);
          }
        });
      });
    });
  };

  // Helper to compile current details to Capsule object
  const buildFinalCapsule = async (): Promise<Capsule | null> => {
    if (!conversation) return null;
    const latestConv = await getLatestConversation();
    const keys = await getApiKeys();
    const capsule = await generateCapsule(latestConv, keys);

    return {
      ...capsule,
      title: title.trim() || capsule.title,
      current_goal: goal.trim() || capsule.current_goal,
      important_decisions: decisions.length > 0 ? decisions : capsule.important_decisions,
      unresolved_tasks: tasks.length > 0 
        ? tasks.map(t => ({ text: t, completed: false })) 
        : capsule.unresolved_tasks,
      user_preferences: {
        ...capsule.user_preferences,
        custom_notes: styleNotes.trim()
      }
    };
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const finalCapsule = await buildFinalCapsule();
      if (!finalCapsule) return;

      // Save to library local storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['capsulesLibrary'], (result) => {
          const library = result.capsulesLibrary || [];
          const updatedLib = [finalCapsule, ...library.filter((c: Capsule) => c.id !== finalCapsule.id)];
          chrome.storage.local.set({ capsulesLibrary: updatedLib }, () => {
            triggerCapsuleDownload(finalCapsule, exportFormat);
            setIsGenerating(false);
            onCapsuleSaved();
          });
        });
      } else {
        const demoLib = JSON.parse(localStorage.getItem('capsulesLibrary') || '[]');
        localStorage.setItem('capsulesLibrary', JSON.stringify([finalCapsule, ...demoLib]));
        triggerCapsuleDownload(finalCapsule, exportFormat);
        setIsGenerating(false);
        onCapsuleSaved();
      }
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleContinueOn = async (platformName: string, targetUrl: string) => {
    setIsGenerating(true);
    try {
      const finalCapsule = await buildFinalCapsule();
      if (!finalCapsule) return;

      const prompt = buildRestorationPrompt(finalCapsule);

      // Save prompt for auto-injection in the opened tab
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ pendingInjectionPrompt: prompt }, () => {
          chrome.storage.local.get(['capsulesLibrary'], (result) => {
            const library = result.capsulesLibrary || [];
            const updatedLib = [finalCapsule, ...library.filter((c: Capsule) => c.id !== finalCapsule.id)];
            chrome.storage.local.set({ capsulesLibrary: updatedLib }, () => {
              chrome.tabs.create({ url: targetUrl });
              setIsGenerating(false);
              onCapsuleSaved();
            });
          });
        });
      } else {
        const demoLib = JSON.parse(localStorage.getItem('capsulesLibrary') || '[]');
        localStorage.setItem('capsulesLibrary', JSON.stringify([finalCapsule, ...demoLib]));
        localStorage.setItem('pendingInjectionPrompt', prompt);
        alert(`Continuity triggered for ${platformName}.\nStorage staged, opening: ${targetUrl}`);
        setIsGenerating(false);
        onCapsuleSaved();
      }
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="bg-cream-card border border-cream-border rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-sm">
        <AlertCircle className="w-8 h-8 text-cream-text" />
        <h3 className="text-sm font-bold text-cream-text">Connection Offline</h3>
        <p className="text-xs text-cream-muted leading-relaxed max-w-xs">{error}</p>
        <button
          onClick={connectToActiveTab}
          className="text-xs font-semibold text-cream-text hover:bg-cream-pill flex items-center gap-1.5 transition-all bg-cream-input py-2 px-4 rounded-full border border-cream-border cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reconnect Scraper
        </button>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="w-6 h-6 text-cream-text animate-spin mb-4" />
        <p className="text-xs text-cream-text font-bold">Bridging active page DOM...</p>
        <p className="text-[10px] text-cream-muted mt-1 max-w-[180px] leading-normal">
          Awaiting matching selectors on active tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Direct Continuation & Main Exporter Actions */}
      <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="bg-cream-pill text-cream-text text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-cream-border/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cream-text animate-pulse"></span>
            Observing turns
          </span>
          <span className="text-[10px] text-cream-muted font-bold capitalize bg-cream-pill/40 px-2.5 py-0.5 rounded">
            {conversation.platform}
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-cream-muted font-bold">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text outline-none transition-all shadow-inner font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-cream-bg/40 py-2 px-3 rounded-xl border border-cream-border/40">
            <div className="text-sm font-extrabold text-cream-text">{conversation.messages.length}</div>
            <div className="text-[8px] text-cream-muted font-bold uppercase tracking-wider">Turns</div>
          </div>
          <div className="bg-cream-bg/40 py-2 px-3 rounded-xl border border-cream-border/40">
            <div className="text-sm font-extrabold text-cream-text">
              {conversation.messages.filter(m => m.role === 'user').length}
            </div>
            <div className="text-[8px] text-cream-muted font-bold uppercase tracking-wider">Prompts</div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleExport}
          disabled={isGenerating || conversation.messages.length === 0}
          className="w-full bg-cream-text hover:bg-neutral-800 disabled:bg-cream-muted/40 text-cream-bg rounded-full py-3 px-6 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {isGenerating ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          Export & Save Conversation
        </button>

        {/* Format Selectors */}
        <div className="flex gap-1 bg-cream-pill p-1 rounded-xl border border-cream-border/20">
          {(['html', 'markdown', 'json', 'capsule'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`flex-1 text-[9px] font-bold py-1.5 rounded-lg uppercase transition-all cursor-pointer ${
                exportFormat === fmt
                  ? 'bg-cream-card text-cream-text shadow-sm'
                  : 'text-cream-muted hover:text-cream-text'
              }`}
            >
              {fmt === 'markdown' ? 'MD' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CONTINUE CHAT ON... Grid */}
      <div className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-[9px] uppercase tracking-wider font-bold text-cream-muted">Continue Chat on...</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'ChatGPT', url: 'https://chatgpt.com/', icon: <ChatGPTLogo /> },
            { name: 'Claude', url: 'https://claude.ai/new', icon: <ClaudeLogo /> },
            { name: 'Gemini', url: 'https://gemini.google.com/app', icon: <GeminiLogo /> },
            { name: 'Grok', url: 'https://grok.com/', icon: <GrokLogo /> },
            { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: <PerplexityLogo /> },
            { name: 'Poe', url: 'https://poe.com/', icon: <PoeLogo /> },
            { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: <DeepSeekLogo /> },
            { name: 'Local', url: 'http://localhost:3000/', icon: <LocalLogo /> }
          ].map((ai) => (
            <button
              key={ai.name}
              onClick={() => handleContinueOn(ai.name, ai.url)}
              disabled={isGenerating || conversation.messages.length === 0}
              className="flex flex-col items-center gap-1.5 p-2.5 bg-cream-input hover:bg-cream-pill border border-cream-border rounded-xl transition-all cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed text-center"
            >
              <span className="text-base leading-none group-hover:scale-110 transition-transform">{ai.icon}</span>
              <span className="text-[8px] font-bold text-cream-muted leading-tight truncate w-full group-hover:text-cream-text">{ai.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Manual Meta Overrides / Context Notes */}
      <div className="space-y-4">
        {/* Goal */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-cream-muted font-bold">Active Objective / Goal</label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe the current target of this conversation..."
            rows={2}
            className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text outline-none transition-all resize-none shadow-inner placeholder-cream-muted/50 font-medium"
          />
        </div>

        {/* Decisions */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-cream-muted font-bold">Key Decisions & Tech Stack</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Using Tailwind CSS v4"
              value={newDecision}
              onChange={(e) => setNewDecision(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDecision()}
              className="flex-1 bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text outline-none transition-all placeholder-cream-muted/50 font-medium"
            />
            <button
              onClick={addDecision}
              className="bg-cream-text hover:bg-neutral-800 text-cream-bg rounded-xl p-2.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {decisions.length > 0 && (
            <ul className="space-y-1 mt-1.5 bg-cream-card/50 p-2 rounded-xl border border-cream-border/60">
              {decisions.map((dec, idx) => (
                <li key={idx} className="text-[10px] text-cream-text/95 flex justify-between items-center bg-cream-input py-1 px-2.5 rounded-lg border border-cream-border/30 font-medium">
                  <span className="truncate max-w-[210px]">{dec}</span>
                  <button onClick={() => removeDecision(idx)} className="text-cream-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tasks */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-cream-muted font-bold">Pending Actions (Next Steps)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Test context auto-injector"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1 bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text outline-none transition-all placeholder-cream-muted/50 font-medium"
            />
            <button
              onClick={addTask}
              className="bg-cream-text hover:bg-neutral-800 text-cream-bg rounded-xl p-2.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {tasks.length > 0 && (
            <ul className="space-y-1 mt-1.5 bg-cream-card/50 p-2 rounded-xl border border-cream-border/60">
              {tasks.map((task, idx) => (
                <li key={idx} className="text-[10px] text-cream-text/95 flex justify-between items-center bg-cream-input py-1 px-2.5 rounded-lg border border-cream-border/30 font-medium">
                  <span className="truncate max-w-[210px]">{task}</span>
                  <button onClick={() => removeTask(idx)} className="text-cream-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tone override */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider text-cream-muted font-bold">Custom Preference Notes</label>
          <input
            type="text"
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="e.g. modular, descriptive comments"
            className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text outline-none transition-all placeholder-cream-muted/50 font-medium"
          />
        </div>
      </div>
    </div>
  );
};
