import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Bot, CalendarClock, ChevronsRight, Pause, Play, Search, Wallet } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { searchAll } from '../store/selectors';
import { TabId } from '../types';
import { addDays, formatDate, formatINR, formatPct } from '../lib/format';
import { Badge, cn } from './common/ui';
import WalletModal from './WalletModal';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Explore' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'funds', label: 'Mutual Funds' },
  { id: 'fno', label: 'F&O' },
  { id: 'bonds', label: 'Bonds' },
  { id: 'ipo', label: 'IPO' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'planner', label: 'Goals & Planner' },
  { id: 'calculators', label: 'Calculators' },
];

function GlobalSearch() {
  const { state } = useStore();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchAll(state, q, 10), [state.stocks, state.funds, state.bonds, q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (i: number) => {
    const r = results[i];
    if (!r) return;
    if (r.kind === 'stock') nav.openStock(r.item.id);
    else if (r.kind === 'mf') nav.openFund(r.item.id);
    else nav.setTab('bonds');
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative flex-1 max-w-xl">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && choose(0)}
        placeholder="Search stocks, ETFs, mutual funds, bonds…"
        aria-label="Search instruments"
        className="w-full rounded-xl bg-slate-100 border border-transparent focus:bg-white focus:border-emerald-400 focus:outline-none pl-9 pr-3 py-2 text-sm"
      />
      {open && q.trim() && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {results.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">No results for “{q}”</div>}
          {results.map((r, i) => (
            <button key={`${r.kind}-${r.item.id}`} onClick={() => choose(i)} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{r.item.name}</div>
                <div className="text-xs text-slate-500">
                  {r.kind === 'stock' ? `${r.item.ticker} · ${r.item.instrument === 'ETF' ? 'ETF' : r.item.sector}` : r.kind === 'mf' ? `${r.item.category} · ${r.item.subCategory}` : `${r.item.type} · ${r.item.rating}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                {r.kind === 'stock' && (
                  <>
                    <div className="text-sm font-semibold tabular-nums">{formatINR(r.item.price)}</div>
                    <div className={cn('text-xs tabular-nums', r.item.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatPct(r.item.changePercent)}</div>
                  </>
                )}
                {r.kind === 'mf' && <div className="text-xs text-slate-500">3Y {formatPct(r.item.cagr3y, 1, false)}</div>}
                {r.kind === 'bond' && <div className="text-xs text-slate-500">YTM {r.item.ytm.toFixed(2)}%</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { state, act, liveTicking, setLiveTicking } = useStore();
  const nav = useNav();
  const [walletOpen, setWalletOpen] = useState(false);

  const advance = (days: number) => {
    const target = addDays(state.simDate, days);
    act({ type: 'NEXT_DAY', days, seed: Math.floor(Math.random() * 2 ** 32) }, `Simulation moved to ${formatDate(target)} — SIPs, coupons, expiries and IPO events processed.`);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => nav.setTab('home')} className="flex items-center gap-2 shrink-0" aria-label="WealthWise home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="hidden md:block font-extrabold text-slate-800 text-lg">
              wealthwise<span className="text-emerald-500">.ai</span>
            </span>
          </button>
          <GlobalSearch />
          <div className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-2 py-1">
            <CalendarClock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 tabular-nums" title="Simulated market date">
              {formatDate(state.simDate)}
            </span>
            <button onClick={() => setLiveTicking(!liveTicking)} className="p-1 rounded hover:bg-white text-slate-500" title={liveTicking ? 'Pause live ticks' : 'Resume live ticks'} aria-label={liveTicking ? 'Pause live ticks' : 'Resume live ticks'}>
              {liveTicking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => advance(1)} className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white text-emerald-700 flex items-center gap-0.5" title="Advance one day">
              Next day <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => advance(30)} className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white text-emerald-700" title="Advance 30 days">
              +1M
            </button>
          </div>
          <button onClick={() => setWalletOpen(true)} className="flex items-center gap-2 rounded-xl border border-slate-200 hover:border-emerald-400 px-3 py-2 shrink-0" aria-label="Open wallet">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-800 tabular-nums hidden sm:inline">{formatINR(state.balance, 0)}</span>
          </button>
          <button onClick={nav.openCoach} className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-semibold shrink-0">
            <Bot className="w-4 h-4" /> AI Coach
          </button>
        </div>
        <div className="flex lg:hidden items-center justify-between gap-2 pb-2">
          <Badge tone="slate">
            <CalendarClock className="w-3 h-3" /> {formatDate(state.simDate)}
          </Badge>
          <div className="flex gap-1">
            <button onClick={() => advance(1)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
              Next day
            </button>
            <button onClick={() => advance(30)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
              +1M
            </button>
            <button onClick={nav.openCoach} className="sm:hidden text-xs font-semibold px-2 py-1 rounded-lg bg-slate-900 text-white">
              AI Coach
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto no-scrollbar -mb-px" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => nav.setTab(t.id)}
              className={cn(
                'px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors',
                nav.tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </header>
  );
}
