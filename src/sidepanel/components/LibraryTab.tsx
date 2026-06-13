import React, { useEffect, useState } from 'react';
import type { Capsule } from '../../shared/types';
import { triggerCapsuleDownload, buildRestorationPrompt } from '../../capsule/exporter';
import { Search, Download, Copy, Trash2, Calendar, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';

export const LibraryTab: React.FC = () => {
  const [library, setLibrary] = useState<Capsule[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLibrary = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['capsulesLibrary'], (result) => {
        setLibrary(result.capsulesLibrary || []);
      });
    } else {
      const demoLib = JSON.parse(localStorage.getItem('capsulesLibrary') || '[]');
      setLibrary(demoLib);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleCopyPrompt = (capsule: Capsule) => {
    const prompt = buildRestorationPrompt(capsule);
    navigator.clipboard.writeText(prompt)
      .then(() => {
        setCopiedId(capsule.id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => console.error('Failed to copy prompt:', err));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this capsule?')) {
      const updated = library.filter(c => c.id !== id);
      setLibrary(updated);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ capsulesLibrary: updated });
      } else {
        localStorage.setItem('capsulesLibrary', JSON.stringify(updated));
      }
    }
  };

  const filteredCapsules = library.filter((c) => {
    const query = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(query) ||
      c.platform.toLowerCase().includes(query) ||
      c.summary.toLowerCase().includes(query) ||
      c.current_goal.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search capsules library..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2.5 pl-9 pr-4 text-xs text-cream-text placeholder-cream-muted/50 outline-none transition-all shadow-inner"
        />
        <Search className="w-4 h-4 text-cream-muted absolute left-3 top-3" />
      </div>

      {/* Library Grid */}
      {filteredCapsules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-cream-border rounded-2xl bg-cream-card/20">
          <FileText className="w-8 h-8 text-cream-border mx-auto mb-3" />
          <p className="text-xs text-cream-text font-bold">No capsules saved yet.</p>
          <p className="text-[10px] text-cream-muted mt-1.5 max-w-[180px] mx-auto leading-normal">
            Synthesize a live conversation chat log to populate your library.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCapsules.map((capsule) => {
            const isExpanded = expandedId === capsule.id;
            return (
              <div
                key={capsule.id}
                className="bg-cream-card border border-cream-border rounded-2xl p-5 shadow-sm transition-all hover:border-cream-text/30 relative overflow-hidden group"
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-cream-text leading-snug">
                      {capsule.title}
                    </h3>
                    <div className="flex gap-2.5 items-center mt-1 text-[10px] text-cream-muted font-medium">
                      <span className="bg-cream-pill px-2 py-0.5 rounded-full capitalize text-[9px] border border-cream-border/30 font-semibold">
                        {capsule.platform}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-cream-muted/70" />
                        {new Date(capsule.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {/* Copy Prompt */}
                    <button
                      onClick={() => handleCopyPrompt(capsule)}
                      title="Copy prompt"
                      className="bg-cream-input hover:bg-cream-pill hover:text-cream-text text-cream-muted rounded-full p-2 border border-cream-border transition-colors cursor-pointer"
                    >
                      {copiedId === capsule.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {/* Exporter menu */}
                    <button
                      onClick={() => triggerCapsuleDownload(capsule, 'capsule')}
                      title="Download capsule"
                      className="bg-cream-input hover:bg-cream-pill hover:text-cream-text text-cream-muted rounded-full p-2 border border-cream-border transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(capsule.id)}
                      title="Delete"
                      className="bg-cream-input hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 text-cream-muted rounded-full p-2 border border-cream-border transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-cream-muted leading-relaxed mt-3 select-all">
                  {capsule.summary}
                </p>

                {/* Expansion Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-cream-border/60 space-y-3.5">
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold tracking-wider text-cream-muted">Current Objective:</div>
                      <div className="text-[11px] text-cream-text leading-normal">{capsule.current_goal}</div>
                    </div>

                    {capsule.important_decisions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase font-bold tracking-wider text-cream-muted">Key Decisions:</div>
                        <ul className="list-disc list-inside text-[11px] text-cream-muted space-y-0.5 pl-0.5">
                          {capsule.important_decisions.map((dec, idx) => (
                            <li key={idx} className="truncate">{dec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {capsule.unresolved_tasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase font-bold tracking-wider text-cream-muted">Pending Actions:</div>
                        <ul className="text-[11px] text-cream-muted space-y-0.5 pl-0.5">
                          {capsule.unresolved_tasks.map((task, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-cream-text"></span>
                              <span className="truncate">{task.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {capsule.messages && capsule.messages.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] uppercase font-bold tracking-wider text-cream-muted">Scraped Chat History:</div>
                        <div className="max-h-28 overflow-y-auto border border-cream-border/30 rounded-xl bg-cream-bg/40 p-2.5 space-y-2.5 shadow-inner">
                          {capsule.messages.map((m, idx) => (
                            <div key={idx} className="text-[10px] leading-relaxed border-b border-cream-border/10 pb-1.5 last:border-b-0 last:pb-0">
                              <div className="font-bold text-cream-text/90 capitalize mb-0.5">{m.role === 'user' ? 'User' : 'Assistant'}</div>
                              <div className="text-cream-muted select-text whitespace-pre-wrap">{m.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => triggerCapsuleDownload(capsule, 'markdown')}
                        className="flex-1 bg-cream-input hover:bg-cream-pill border border-cream-border rounded-full py-1.5 px-3 text-[10px] font-bold text-cream-text transition-colors cursor-pointer text-center"
                      >
                        Markdown Summary
                      </button>
                      <button
                        onClick={() => triggerCapsuleDownload(capsule, 'json')}
                        className="flex-1 bg-cream-input hover:bg-cream-pill border border-cream-border rounded-full py-1.5 px-3 text-[10px] font-bold text-cream-text transition-colors cursor-pointer text-center"
                      >
                        JSON Format
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : capsule.id)}
                  className="w-full mt-3 pt-2.5 border-t border-cream-border/30 text-[9px] font-bold text-cream-text hover:text-neutral-700 flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Collapse Details <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Expand Details <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
