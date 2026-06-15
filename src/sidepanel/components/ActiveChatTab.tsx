import React, { useEffect, useState } from 'react';
import type { ScrapedConversation, Capsule } from '../../shared/types';
import { generateCapsule, generateHeuristicSummary } from '../../capsule/summarizer';
import { buildRestorationPrompt, triggerCapsuleDownload } from '../../capsule/exporter';
import { Eye, Plus, Trash2, Cpu, FileText, CheckCircle, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

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
            { name: 'ChatGPT', url: 'https://chatgpt.com/', icon: '💬' },
            { name: 'Claude', url: 'https://claude.ai/new', icon: '🤖' },
            { name: 'Gemini', url: 'https://gemini.google.com/app', icon: '⭐' },
            { name: 'Grok', url: 'https://grok.com/', icon: '✖️' },
            { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: '🔍' },
            { name: 'Poe', url: 'https://poe.com/', icon: '🧪' },
            { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: '🐳' },
            { name: 'Local', url: 'http://localhost:3000/', icon: '🏠' }
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
