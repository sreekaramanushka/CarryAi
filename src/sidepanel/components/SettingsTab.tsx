import React, { useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';
import { Key, Eye, EyeOff, Save, Check } from 'lucide-react';

interface SettingsTabProps {
  onSave?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onSave }) => {
  const { theme, setTheme } = useTheme();
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['openaiApiKey', 'geminiApiKey'], (result) => {
        if (result.openaiApiKey) setOpenaiKey(result.openaiApiKey);
        if (result.geminiApiKey) setGeminiKey(result.geminiApiKey);
      });
    }
  }, []);

  const handleSave = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        openaiApiKey: openaiKey.trim(),
        geminiApiKey: geminiKey.trim()
      }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (onSave) onSave();
      });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold text-cream-text mb-1">Configuration</h2>
        <p className="text-[11px] text-cream-muted leading-relaxed">Manage API integrations, theming preferences, and local parameters.</p>
      </div>

      {/* API Keys Card */}
      <div className="bg-cream-card border border-cream-border rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-[10px] font-bold text-cream-text uppercase tracking-wider flex items-center gap-1.5 border-b border-cream-border/30 pb-2">
          <Key className="w-3.5 h-3.5 text-cream-text/75" /> API Keys
        </h3>

        {/* OpenAI */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-cream-text flex justify-between">
            <span>OpenAI API Key</span>
            <span className="text-[9px] text-cream-muted font-semibold">For synthesis</span>
          </label>
          <div className="relative">
            <input
              type={showOpenai ? 'text' : 'password'}
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text placeholder-cream-muted/30 outline-none transition-all shadow-inner pr-10"
            />
            <button
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-3 top-2 text-cream-muted hover:text-cream-text transition-colors cursor-pointer"
            >
              {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Gemini */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-cream-text flex justify-between">
            <span>Gemini API Key</span>
            <span className="text-[9px] text-cream-muted font-semibold">For synthesis</span>
          </label>
          <div className="relative">
            <input
              type={showGemini ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-cream-input border border-cream-border focus:border-cream-text focus:ring-1 focus:ring-cream-text rounded-xl py-2 px-3 text-xs text-cream-text placeholder-cream-muted/30 outline-none transition-all shadow-inner pr-10"
            />
            <button
              onClick={() => setShowGemini(!showGemini)}
              className="absolute right-3 top-2 text-cream-muted hover:text-cream-text transition-colors cursor-pointer"
            >
              {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="text-[10px] text-cream-muted leading-relaxed bg-cream-bg/40 p-3 rounded-xl border border-cream-border/30">
          <span className="font-bold text-cream-text">Local Storage Priority:</span> API keys are stored 100% locally in your browser context. No external cloud sync or telemetry occurs. CarryAI is privacy-first.
        </div>
      </div>

      {/* Visual Settings Card */}
      <div className="bg-cream-card border border-cream-border rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-[10px] font-bold text-cream-text uppercase tracking-wider border-b border-cream-border/30 pb-2">
          Visual Theming
        </h3>

        <div className="grid grid-cols-3 gap-2 bg-cream-bg/40 p-1.5 rounded-full border border-cream-border/40">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`py-2 px-4 text-[10px] font-bold rounded-full capitalize border transition-all duration-300 cursor-pointer ${
                theme === t
                  ? 'bg-cream-text border-cream-text text-cream-bg shadow-sm'
                  : 'bg-transparent border-transparent text-cream-muted hover:text-cream-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons - Minimalist Pill style */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-cream-text hover:bg-neutral-800 text-cream-bg rounded-full py-3.5 px-6 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm shadow-cream-text/10 cursor-pointer"
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" /> Saved!
            </>
          ) : (
            <>
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
