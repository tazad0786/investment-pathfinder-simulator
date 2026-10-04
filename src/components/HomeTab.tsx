import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Bookmark, Briefcase, Calculator, Coins, Landmark, Layers, PieChart, Rocket, Target } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { portfolioSummary } from '../store/selectors';
import { ipoStatus, sipInstallmentAmount } from '../store/reducer';
import { Stock, TabId } from '../types';
import { formatDate, formatINR, formatNumber, formatPct } from '../lib/format';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Logo, Pills, SectionTitle, Sparkline } from './common/ui';
import { FundRow } from './FundsTab';

type Mover = 'Top gainers' | 'Top losers' | 'Most active' | '52W high';

const COLLECTIONS = [
  { id: 'high', label: 'High return', filter: (f: { category: string }) => f.category === 'Equity' },
  { id: 'tax', label: 'Tax saving (ELSS)', filter: (f: { subCategory: string }) => f.subCategory === 'ELSS' },
  { id: 'index', label: 'Index funds', filter: (f: { category: string }) => f.category === 'Index' },
  { id: 'debt', label: 'Low risk / Debt', filter: (f: { category: string }) => f.category === 'Debt' },
  { id: 'hybrid', label: 'Hybrid', filter: (f: { category: string }) => f.category === 'Hybrid' },
  { id: 'global', label: 'Gold & Global', filter: (f: { category: string }) => f.category === 'Commodity' || f.category === 'International' },
] as const;

const PRODUCTS: { tab: TabId; label: string; icon: typeof BarChart3; desc: string }[] = [
  { tab: 'stocks', label: 'Stocks & ETFs', icon: BarChart3, desc: 'Equity delivery' },
  { tab: 'funds', label: 'Mutual Funds', icon: PieChart, desc: 'SIP & lumpsum' },
  { tab: 'fno', label: 'Futures & Options', icon: Layers, desc: 'Option chain' },
  { tab: 'bonds', label: 'Bonds', icon: Landmark, desc: 'G-Secs, SGBs, corporate' },
  { tab: 'ipo', label: 'IPO', icon: Rocket, desc: 'Apply via UPI' },
  { tab: 'planner', label: 'Goals', icon: Target, desc: 'Plan milestones' },
  { tab: 'calculators', label: 'Calculators', icon: Calculator, desc: 'SIP, EMI, FD…' },
  { tab: 'portfolio', label: 'Portfolio', icon: Briefcase, desc: 'Holdings & orders' },
];

function StockCard({ stock, onClick }: { stock: Stock; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:shadow-sm transition bg-white">
      <div className="flex items-center justify-between">
        <Logo name={stock.name} />
        <Sparkline data={stock.sparkline} width={60} height={24} />
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-800 truncate">{stock.name}</div>
      <div className="text-sm tabular-nums font-bold mt-0.5">{formatINR(stock.price)}</div>
      <Change value={stock.change} pct={stock.changePercent} className="text-xs" />
    </button>
  );
}

export default function HomeTab() {
  const { state } = useStore();
  const nav = useNav();
  const [mover, setMover] = useState<Mover>('Top gainers');
  const [collection, setCollection] = useState<(typeof COLLECTIONS)[number]['id']>('high');
  const summary = portfolioSummary(state);

  const movers = useMemo(() => {
    const eq = state.stocks.filter((s) => s.instrument === 'EQ');
    if (mover === 'Top gainers') return [...eq].sort((a, b) => b.changePercent - a.changePercent).slice(0, 8);
    if (mover === 'Top losers') return [...eq].sort((a, b) => a.changePercent - b.changePercent).slice(0, 8);
    if (mover === 'Most active') return [...eq].sort((a, b) => b.volume * b.price - a.volume * a.price).slice(0, 8);
    return [...eq].sort((a, b) => b.price / b.week52High - a.price / a.week52High).slice(0, 8);
  }, [state.stocks, mover]);

  const funds = useMemo(() => {
    const c = COLLECTIONS.find((x) => x.id === collection)!;
    return state.funds.filter((f) => c.filter(f as never)).sort((a, b) => b.cagr3y - a.cagr3y).slice(0, 5);
  }, [state.funds, collection]);

  const watch = state.watchlist
    .map((k) => state.stocks.find((s) => s.id === k) ?? state.funds.find((f) => f.id === k))
    .filter(Boolean);
  const liveIpos = state.ipos.filter((i) => ['Open', 'Upcoming'].includes(ipoStatus(i, state.simDate))).slice(0, 3);
  const upcomingSips = [...state.sips].filter((s) => s.status === 'ACTIVE').sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 3);
  const sectorPerf = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const s of state.stocks) {
      if (s.instrument !== 'EQ') continue;
      const e = map.get(s.sector) ?? { sum: 0, n: 0 };
      e.sum += s.changePercent;
      e.n++;
      map.set(s.sector, e);
    }
    return Array.from(map, ([sector, { sum, n }]) => ({ sector, pct: sum / n })).sort((a, b) => b.pct - a.pct);
  }, [state.stocks]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {state.indices.map((i) => {
          const pct = ((i.value - i.prevClose) / i.prevClose) * 100;
          return (
            <Card key={i.id} className="px-4 py-3 min-w-[170px] shrink-0">
              <div className="text-xs font-semibold text-slate-500">{i.name}</div>
              <div className="font-bold tabular-nums text-slate-800">{formatNumber(i.value)}</div>
              <Change value={i.value - i.prevClose} pct={pct} className="text-xs" />
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-300">Total net worth (virtual)</div>
                <div className="text-3xl font-bold tabular-nums">{formatINR(summary.netWorth)}</div>
                <div className="text-sm mt-1">
                  Day's change{' '}
                  <span className={summary.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {summary.dayChange >= 0 ? '+' : ''}
                    {formatINR(summary.dayChange)}
                  </span>
                </div>
              </div>
              <Button variant="primary" onClick={() => nav.setTab('portfolio')}>
                View portfolio <ArrowRight className="w-4 h-4 inline" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
              <div><div className="text-slate-400 text-xs">Invested</div><div className="font-semibold tabular-nums">{formatINR(summary.invested, 0)}</div></div>
              <div><div className="text-slate-400 text-xs">Current</div><div className="font-semibold tabular-nums">{formatINR(summary.current, 0)}</div></div>
              <div>
                <div className="text-slate-400 text-xs">Total returns</div>
                <div className={cn('font-semibold tabular-nums', summary.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {formatINR(summary.pnl, 0)} ({formatPct(summary.pnlPct)})
                </div>
              </div>
              <div><div className="text-slate-400 text-xs">Wallet</div><div className="font-semibold tabular-nums">{formatINR(summary.cash, 0)}</div></div>
            </div>
          </Card>

          <div className="grid grid-cols-4 gap-3">
            {PRODUCTS.map((p) => (
              <button key={p.tab} onClick={() => nav.setTab(p.tab)} className="rounded-xl bg-white border border-slate-200 p-3 hover:border-emerald-400 text-center">
                <p.icon className="w-6 h-6 mx-auto text-emerald-600" />
                <div className="text-xs sm:text-sm font-semibold text-slate-800 mt-1.5">{p.label}</div>
                <div className="hidden sm:block text-[11px] text-slate-400">{p.desc}</div>
              </button>
            ))}
          </div>

          <section>
            <SectionTitle action={<Button variant="ghost" size="sm" onClick={() => nav.setTab('stocks')}>See all</Button>}>Stocks in focus</SectionTitle>
            <Pills options={['Top gainers', 'Top losers', 'Most active', '52W high'] as const} value={mover} onChange={setMover} size="sm" className="mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {movers.map((s) => <StockCard key={s.id} stock={s} onClick={() => nav.openStock(s.id)} />)}
            </div>
          </section>

          <section>
            <SectionTitle action={<Button variant="ghost" size="sm" onClick={() => nav.setTab('funds')}>See all</Button>}>Mutual fund collections</SectionTitle>
            <Pills options={COLLECTIONS.map((c) => ({ id: c.id, label: c.label }))} value={collection} onChange={setCollection} size="sm" className="mb-3" />
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {funds.map((f) => <FundRow key={f.id} fund={f} onClick={() => nav.openFund(f.id)} />)}
            </Card>
          </section>

          <section>
            <SectionTitle>Sector performance today</SectionTitle>
            <Card className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sectorPerf.map((s) => (
                <div key={s.sector} className={cn('rounded-lg px-3 py-2 text-xs', s.pct >= 0 ? 'bg-emerald-50' : 'bg-rose-50')}>
                  <div className="font-semibold text-slate-700 truncate">{s.sector}</div>
                  <Change pct={s.pct} showAbs={false} />
                </div>
              ))}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <SectionTitle>Watchlist</SectionTitle>
            {watch.length === 0 ? (
              <EmptyState icon={<Bookmark className="w-5 h-5" />} title="Your watchlist is empty" text="Bookmark stocks or funds from their detail page." />
            ) : (
              <div className="divide-y divide-slate-100">
                {watch.map((w) =>
                  'ticker' in w! ? (
                    <button key={w.id} onClick={() => nav.openStock(w.id)} className="w-full flex items-center justify-between py-2.5 text-left">
                      <div className="min-w-0"><div className="text-sm font-semibold truncate">{w.name}</div><div className="text-xs text-slate-500">{w.ticker}</div></div>
                      <div className="text-right shrink-0"><div className="text-sm font-semibold tabular-nums">{formatINR(w.price)}</div><Change pct={w.changePercent} showAbs={false} className="text-xs" /></div>
                    </button>
                  ) : (
                    <button key={w!.id} onClick={() => nav.openFund(w!.id)} className="w-full flex items-center justify-between py-2.5 text-left">
                      <div className="min-w-0"><div className="text-sm font-semibold truncate">{w!.name}</div><div className="text-xs text-slate-500">{w!.subCategory}</div></div>
                      <div className="text-right shrink-0"><div className="text-xs text-slate-500">3Y</div><Change pct={w!.cagr3y} showAbs={false} className="text-sm" /></div>
                    </button>
                  ),
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle action={<Button variant="ghost" size="sm" onClick={() => nav.setTab('ipo')}>All IPOs</Button>}>IPOs</SectionTitle>
            {liveIpos.length === 0 ? <p className="text-sm text-slate-500">No open or upcoming IPOs.</p> : (
              <div className="space-y-3">
                {liveIpos.map((i) => (
                  <button key={i.id} onClick={() => nav.setTab('ipo')} className="w-full text-left flex items-center gap-3">
                    <Logo name={i.company} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{i.company}</div>
                      <div className="text-xs text-slate-500">₹{i.priceLow}–{i.priceHigh} · {formatDate(i.openDate)}</div>
                    </div>
                    <Badge tone={ipoStatus(i, state.simDate) === 'Open' ? 'green' : 'blue'}>{ipoStatus(i, state.simDate)}</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle action={<Button variant="ghost" size="sm" onClick={() => nav.setTab('portfolio')}>Manage</Button>}>Upcoming SIPs</SectionTitle>
            {upcomingSips.length === 0 ? <p className="text-sm text-slate-500">No active SIPs. Start one from any mutual fund.</p> : (
              <div className="space-y-2">
                {upcomingSips.map((s) => {
                  const f = state.funds.find((x) => x.id === s.fundId);
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0"><div className="font-semibold truncate">{f?.name}</div><div className="text-xs text-slate-500">{formatDate(s.nextDate)}</div></div>
                      <span className="font-semibold tabular-nums">{formatINR(sipInstallmentAmount(s), 0)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4 bg-emerald-50 border-emerald-100">
            <div className="flex gap-3">
              <Coins className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">Not sure where to start?</div>
                <p className="text-sm text-slate-600 mt-1">Take the 2-minute risk profile and get a personalised asset mix.</p>
                <Button size="sm" className="mt-2" onClick={() => nav.setTab('planner')}>Find my path</Button>
              </div>
            </div>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
