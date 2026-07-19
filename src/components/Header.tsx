import React from 'react';
import { TrendingUp, Search, Wallet, Compass, Award, Percent, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  balance: number;
  openAiCoach: () => void;
}

export default function Header({ activeTab, setActiveTab, balance, openAiCoach }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md" id="app-header">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div 
          className="flex cursor-pointer items-center space-x-2.5" 
          onClick={() => setActiveTab('dashboard')}
          id="brand-logo-container"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <TrendingUp className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-xl tracking-tight text-slate-900">
              wealthwise<span className="text-emerald-500">.ai</span>
            </span>
            <span className="font-mono text-[9px] font-medium tracking-widest text-slate-400 uppercase">
              Smart Compounder
            </span>
          </div>
        </div>

        {/* Global Search Bar Placeholder */}
        <div className="hidden max-w-md flex-1 px-8 md:block" id="global-search-container">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search stocks, mutual funds, gold or calculators..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm outline-none transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
              disabled
            />
          </div>
        </div>

        {/* User Balance & Actions */}
        <div className="flex items-center space-x-4" id="header-user-actions">
          {/* Mock Balance Counter */}
          <div 
            className="flex items-center space-x-2 rounded-full bg-emerald-50 px-3.5 py-1.5 border border-emerald-100/50"
            title="Available Simulated Trading Cash"
            id="user-balance-badge"
          >
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="font-sans font-bold text-sm text-emerald-800">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* AI Coach Button */}
          <button
            onClick={openAiCoach}
            className="group relative flex h-9 items-center space-x-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-850 hover:shadow-md hover:scale-[1.02] active:scale-95"
            id="ai-coach-trigger"
          >
            <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <Compass className="h-3.5 w-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span>AI Coach</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation Row */}
      <div className="bg-slate-50 border-t border-slate-100" id="header-tabs-row">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex space-x-8 overflow-x-auto py-0 scrollbar-none" aria-label="Tabs" id="nav-tabs">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Award },
              { id: 'stocks', name: 'Stocks', icon: TrendingUp },
              { id: 'funds', name: 'Mutual Funds', icon: Percent },
              { id: 'wizard', name: 'InvestPath Finder', icon: Compass },
              { id: 'calculators', name: 'SIP Calculator', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 border-b-2 py-3 px-1 text-sm font-semibold transition-all outline-none whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
