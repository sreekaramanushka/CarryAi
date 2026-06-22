import React, { useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { ActiveChatTab } from './components/ActiveChatTab';
import { LibraryTab } from './components/LibraryTab';
import { ImportTab } from './components/ImportTab';
import { SettingsTab } from './components/SettingsTab';
import { Sparkles, Database, FileUp, Settings as SettingsIcon } from 'lucide-react';

type TabId = 'active' | 'library' | 'import' | 'settings';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('active');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'active':
        return <ActiveChatTab onCapsuleSaved={() => setActiveTab('library')} />;
      case 'library':
        return <LibraryTab />;
      case 'import':
        return <ImportTab />;
      case 'settings':
        return <SettingsTab onSave={() => setActiveTab('active')} />;
      default:
        return <ActiveChatTab onCapsuleSaved={() => setActiveTab('library')} />;
    }
  };

  const navItems = [
    { id: 'active', label: 'Scrape', icon: Sparkles },
    { id: 'library', label: 'Library', icon: Database },
    { id: 'import', label: 'Import', icon: FileUp },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-cream-bg text-cream-text font-sans antialiased select-none">
      {/* Premium Minimalist Header */}
      <header className="sticky top-0 z-50 bg-cream-bg/95 backdrop-blur-md border-b border-cream-border/60 px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          {/* Logo - Actual PNG */}
          <img src="/icon48.png" className="w-6 h-6 rounded-full shadow-sm select-none" alt="CarryAI Logo" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-cream-text">
              Carry<span className="font-serif italic font-medium ml-[1px]">AI</span>
            </h1>
          </div>
        </div>
        <div className="text-[10px] font-bold text-cream-text bg-cream-pill px-3 py-1 rounded-full border border-cream-border/20 shadow-sm">
          v1.0
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {renderTabContent()}
      </main>

      {/* Sticky Bottom Tabbar - Matching Framer Aesthetic */}
      <nav className="fixed bottom-4 left-2.5 right-2.5 z-50 bg-cream-card/90 backdrop-blur-xl border border-cream-border/60 p-1 rounded-full flex justify-between shadow-lg shadow-cream-text/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1 rounded-full transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'text-cream-bg bg-cream-text font-semibold shadow-sm px-3.5 py-2'
                  : 'text-cream-muted hover:text-cream-text hover:bg-cream-pill/40 px-2.5 py-1.5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
