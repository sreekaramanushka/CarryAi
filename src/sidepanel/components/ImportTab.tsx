import React, { useState } from 'react';
import type { Capsule } from '../../shared/types';
import { buildRestorationPrompt } from '../../capsule/exporter';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowRight, Copy, Check } from 'lucide-react';

export const ImportTab: React.FC = () => {
  const [importedCapsule, setImportedCapsule] = useState<Capsule | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [injectionSuccess, setInjectionSuccess] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    setInjectionSuccess(null);
    
    if (!file.name.endsWith('.capsule') && !file.name.endsWith('.json')) {
      setError('Please import a valid .capsule or .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.title || !json.summary || !json.current_goal || !Array.isArray(json.important_decisions)) {
          setError('Invalid capsule schema. Missing required parameters.');
          return;
        }
        setImportedCapsule(json as Capsule);
      } catch (err) {
        setError('Failed to parse file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleInject = () => {
    if (!importedCapsule) return;
    setInjectionSuccess(null);

    const prompt = buildRestorationPrompt(importedCapsule);

    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.log('Demo Injection Prompt:', prompt);
      setInjectionSuccess(true);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        setError('No active tab identified. Click inside your target chat tab first.');
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, {
        type: 'INJECT_CAPSULE',
        payload: { prompt }
      }, (response) => {
        if (chrome.runtime.lastError) {
          setError('Failed to reach scraper script. Please refresh the chat page and try again.');
          return;
        }

        if (response && response.payload && response.payload.success) {
          setInjectionSuccess(true);
        } else {
          setInjectionSuccess(false);
        }
      });
    });
  };

  const handleCopyPrompt = () => {
    if (!importedCapsule) return;
    const prompt = buildRestorationPrompt(importedCapsule);
    navigator.clipboard.writeText(prompt)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const handleClear = () => {
    setImportedCapsule(null);
    setError(null);
    setInjectionSuccess(null);
  };

  return (
    <div className="space-y-5">
      {!importedCapsule ? (
        <>
          {/* Explanation Card */}
          <div className="bg-cream-card border border-cream-border rounded-2xl p-4.5 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-cream-text">Why Import Capsules?</h3>
            <p className="text-[10px] text-cream-muted leading-relaxed font-medium">
              Importing allows you to restore a previously downloaded session state (a <code className="bg-cream-pill px-1 py-0.5 rounded font-mono text-[9px]">.capsule</code> or <code className="bg-cream-pill px-1 py-0.5 rounded font-mono text-[9px]">.json</code> file) into the active AI chat prompt box.
            </p>
            <div className="space-y-2 mt-1">
              <div className="flex gap-2 items-start text-[10px] text-cream-muted">
                <span className="text-cream-text">🔄</span>
                <span className="leading-normal font-medium"><strong>Cross-Device Portability:</strong> Move your active context and memory to other browsers or devices.</span>
              </div>
              <div className="flex gap-2 items-start text-[10px] text-cream-muted">
                <span className="text-cream-text">💾</span>
                <span className="leading-normal font-medium"><strong>Backup & Restore:</strong> Archive project snapshots locally and load them to continue anytime.</span>
              </div>
              <div className="flex gap-2 items-start text-[10px] text-cream-muted">
                <span className="text-cream-text">⚡</span>
                <span className="leading-normal font-medium"><strong>One-Click Autofill:</strong> Fill the chat input field with goals, style choices, and pending tasks instantly.</span>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              dragActive
                ? 'border-cream-text bg-cream-pill/40'
                : 'border-cream-border bg-cream-card/45 hover:border-cream-text/70'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-cream-text/80 mx-auto mb-4" />
            <p className="text-xs font-bold text-cream-text">Drag & Drop Capsule File</p>
            <p className="text-[10px] text-cream-muted mt-1 font-medium">Supports .capsule or .json files</p>
          <div className="mt-5">
            <label className="bg-cream-input hover:bg-cream-pill border border-cream-border rounded-full px-5 py-2 text-[10px] font-bold text-cream-text transition-colors cursor-pointer select-none">
              Browse Files
              <input
                type="file"
                accept=".capsule,.json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>
          {error && (
            <div className="mt-5 text-[10px] text-neutral-800 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center justify-center gap-1.5 leading-snug">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        </>
      ) : (
        // Preview zone
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-cream-card p-4 rounded-2xl border border-cream-border shadow-sm">
            <div className="flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-cream-text/80" />
              <div>
                <h3 className="text-xs font-bold text-cream-text leading-tight">{importedCapsule.title}</h3>
                <p className="text-[9px] text-cream-muted mt-0.5 font-semibold capitalize">Platform: {importedCapsule.platform}</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="text-[10px] text-cream-text hover:bg-cream-pill bg-cream-input py-1 px-3 rounded-full border border-cream-border transition-colors cursor-pointer font-bold"
            >
              Clear
            </button>
          </div>

          {/* Capsule Content Preview */}
          <div className="bg-cream-input p-5 border border-cream-border/60 rounded-2xl space-y-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-cream-muted uppercase tracking-wider">Context Summary</span>
              <p className="text-[11px] text-cream-text leading-relaxed mt-0.5">{importedCapsule.summary}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-cream-muted uppercase tracking-wider">Objective</span>
              <p className="text-[11px] text-cream-text leading-relaxed mt-0.5 font-semibold">{importedCapsule.current_goal}</p>
            </div>
            {importedCapsule.important_decisions.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-cream-muted uppercase tracking-wider">Key decisions</span>
                <ul className="list-disc list-inside text-[11px] text-cream-muted mt-0.5 space-y-0.5">
                  {importedCapsule.important_decisions.slice(0, 3).map((dec, i) => (
                    <li key={i} className="truncate">{dec}</li>
                  ))}
                </ul>
              </div>
            )}
            {importedCapsule.messages && importedCapsule.messages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-cream-muted uppercase tracking-wider">Restored Message Log ({importedCapsule.messages.length})</span>
                <div className="max-h-24 overflow-y-auto border border-cream-border/30 rounded-xl bg-cream-bg/40 p-2.5 space-y-2.5 shadow-inner mt-0.5">
                  {importedCapsule.messages.map((m, idx) => (
                    <div key={idx} className="text-[10px] leading-relaxed border-b border-cream-border/10 pb-1.5 last:border-b-0 last:pb-0">
                      <div className="font-bold text-cream-text/90 capitalize mb-0.5">{m.role === 'user' ? 'User' : 'Assistant'}</div>
                      <div className="text-cream-muted select-text whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution feedback */}
          {injectionSuccess === true && (
            <div className="text-[11px] text-neutral-800 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold text-emerald-950">Context Capsule Injected!</strong>
                <p className="text-[10px] text-emerald-800 mt-0.5">Restoration prompt has been filled in. Click inside the chatbox and press Enter to load the memory.</p>
              </div>
            </div>
          )}

          {injectionSuccess === false && (
            <div className="text-[11px] text-neutral-800 bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold text-amber-950">Autofill Blocked</strong>
                <p className="text-[10px] text-amber-800 mt-0.5">Could not find chat input field. Please copy the prompt manually and paste it into the textbox.</p>
              </div>
            </div>
          )}

          {/* Action triggers */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleInject}
              className="bg-cream-text hover:bg-neutral-800 text-cream-bg rounded-full py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-cream-text/10 cursor-pointer active:scale-[0.98]"
            >
              Autofill Chat <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyPrompt}
              className="bg-cream-input hover:bg-cream-pill border border-cream-border text-cream-text rounded-full py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Prompt
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
