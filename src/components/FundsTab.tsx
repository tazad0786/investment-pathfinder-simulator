import { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Lock, Search } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { FUND_CATEGORIES } from '../data/funds';
import { FundCategory, MutualFund } from '../types';
import { addMonths, formatCrore, formatDate, formatINR, formatNumber, formatPct } from '../lib/format';
import { lumpsumFutureValue, sipFutureValue } from '../lib/finance';
import { exitLoadApplies, isLockedIn } from '../store/reducer';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Field, inputClass, Logo, Modal, NumberInput, Pager, Pills, riskTone, Slider, Stars, Stat } from './common/ui';
import PriceChart from './common/PriceChart';

type SortKey = 'cagr3y' | 'cagr1y' | 'cagr5y' | 'aum' | 'expense' | 'rating';
const PAGE = 20;

function InvestPanel({ fund }: { fund: MutualFund }) {
  const { state, act } = useStore();
  const [mode, setMode] = useState<'SIP' | 'LUMPSUM'>('SIP');
  const [amount, setAmount] = useState(Math.max(fund.minSip, 1000));
  const [day, setDay] = useState(5);
  const [stepUp, setStepUp] = useState(0);
  const submit = () =>
    act(
      { type: 'FUND_INVEST', fundId: fund.id, amount, mode, dayOfMonth: mode === 'SIP' ? day : undefined, stepUpPercent: mode === 'SIP' ? stepUp : undefined },
      mode === 'SIP' ? `Monthly SIP of ${formatINR(amount, 0)} started — first instalment invested.` : `${formatINR(amount, 0)} invested in ${fund.name}.`,
    );
  return (
    <Card className="p-5">
      <Pills options={[{ id: 'SIP', label: 'Monthly SIP' }, { id: 'LUMPSUM', label: 'One-time' }] as const} value={mode} onChange={(m) => { setMode(m); setAmount(m === 'SIP' ? Math.max(fund.minSip, 1000) : Math.max(fund.minLumpsum, 5000)); }} className="mb-4" />
      <div className="space-y-3">
        <Field label={mode === 'SIP' ? 'SIP amount' : 'Investment amount'} hint={`Minimum ${formatINR(mode === 'SIP' ? fund.minSip : fund.minLumpsum, 0)}`}>
          <NumberInput value={amount} onChange={setAmount} prefix="₹" min={1} />
        </Field>
        {mode === 'SIP' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="SIP date (monthly)">
              <select className={inputClass} value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Annual step-up">
              <select className={inputClass} value={stepUp} onChange={(e) => setStepUp(Number(e.target.value))}>
                {[0, 5, 10, 15, 20].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-3">
        Wallet balance: <span className="font-semibold text-slate-700">{formatINR(state.balance)}</span>
        {mode === 'SIP' && ' · First instalment is debited today.'}
      </div>
      <Button size="lg" className="w-full mt-4" onClick={submit}>
        {mode === 'SIP' ? 'Start SIP' : 'Invest now'}
      </Button>
    </Card>
  );
}

function RedeemModal({ fund, open, onClose }: { fund: MutualFund; open: boolean; onClose: () => void }) {
  const { state, act } = useStore();
  const h = state.holdings.find((x) => x.assetType === 'mf' && x.assetId === fund.id);
  const [units, setUnits] = useState(h?.quantity ?? 0);
  if (!h) return null;
  const gross = (Number.isFinite(units) ? units : 0) * fund.nav;
  const load = exitLoadApplies(fund, h.firstBuyDate, state.simDate) ? (gross * fund.exitLoadPct) / 100 : 0;
  const locked = isLockedIn(fund, h.firstBuyDate, state.simDate);
  const submit = () => {
    if (act({ type: 'FUND_REDEEM', fundId: fund.id, units }, `Redeemed ${formatNumber(units, 3)} units for ${formatINR(gross - load)}.`)) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={`Redeem ${fund.name}`}>
      <div className="text-sm text-slate-600 mb-3">
        You hold <b>{formatNumber(h.quantity, 3)}</b> units worth <b>{formatINR(h.quantity * fund.nav)}</b>.
      </div>
      {locked && (
        <div className="flex gap-2 items-start rounded-xl bg-amber-50 text-amber-800 text-sm p-3 mb-3">
          <Lock className="w-4 h-4 mt-0.5" /> ELSS units are locked in until {formatDate(addMonths(h.firstBuyDate, fund.lockInYears * 12))}.
        </div>
      )}
      <Field label="Units to redeem">
        <NumberInput value={units} onChange={setUnits} min={0} step={0.001} />
      </Field>
      <div className="flex gap-2 mt-2">
        {[25, 50, 100].map((p) => (
          <button key={p} className="text-xs font-semibold rounded-lg border border-slate-200 px-2 py-1 hover:border-emerald-400" onClick={() => setUnits(+((h.quantity * p) / 100).toFixed(4))}>
            {p}%
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-slate-50 p-3 mt-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Redemption value</span><span className="font-semibold tabular-nums">{formatINR(gross)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Exit load ({fund.exitLoadPct}% within {fund.exitLoadDays} days)</span><span className="font-semibold tabular-nums text-rose-600">-{formatINR(load)}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-700 font-semibold">You receive</span><span className="font-bold tabular-nums">{formatINR(gross - load)}</span></div>
      </div>
      <Button variant="danger" size="lg" className="w-full mt-4" disabled={locked} onClick={submit}>
        Redeem
      </Button>
    </Modal>
  );
}

function ReturnCalculator({ fund }: { fund: MutualFund }) {
  const [mode, setMode] = useState<'SIP' | 'One-time'>('SIP');
  const [amount, setAmount] = useState(5000);
  const [years, setYears] = useState(5);
  const rate = fund.cagr3y;
  const invested = mode === 'SIP' ? amount * 12 * years : amount;
  const value = mode === 'SIP' ? sipFutureValue(amount, rate, years) : lumpsumFutureValue(amount, rate, years);
  return (
    <Card className="p-5">
      <h2 className="font-bold text-slate-800 mb-3">Return calculator</h2>
      <Pills options={['SIP', 'One-time'] as const} value={mode} onChange={setMode} size="sm" className="mb-4" />
      <div className="space-y-4">
        <Slider label={mode === 'SIP' ? 'Monthly amount (₹)' : 'Amount (₹)'} value={amount} onChange={setAmount} min={500} max={mode === 'SIP' ? 100000 : 1000000} step={500} />
        <Slider label="Years" value={years} onChange={setYears} min={1} max={30} />
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
        <Stat label="Invested" value={formatINR(invested, 0)} />
        <Stat label="Est. returns" value={<span className="text-emerald-600">{formatINR(value - invested, 0)}</span>} />
        <Stat label="Total value" value={formatINR(value, 0)} />
      </div>
      <p className="text-[11px] text-slate-400 mt-3">Assumes the fund's 3Y CAGR of {rate}% p.a. continues. Past performance does not guarantee future returns.</p>
    </Card>
  );
}

function FundDetail({ fund }: { fund: MutualFund }) {
  const { state, act } = useStore();
  const nav = useNav();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const watched = state.watchlist.includes(fund.id);
  const h = state.holdings.find((x) => x.assetType === 'mf' && x.assetId === fund.id);
  const sips = state.sips.filter((s) => s.fundId === fund.id);
  const peers = state.funds.filter((f) => f.subCategory === fund.subCategory);
  const avg = (k: 'cagr1y' | 'cagr3y' | 'cagr5y') => {
    const vals = peers.map((f) => f[k]).filter((v) => v !== 0);
    return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
  };
  const dayPct = ((fund.nav - fund.prevNav) / fund.prevNav) * 100;

  return (
    <div className="space-y-4">
      <button onClick={() => nav.openFund(null)} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> All mutual funds
      </button>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Logo name={fund.amc} />
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{fund.name}</h1>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge tone="blue">{fund.category}</Badge>
                    <Badge>{fund.subCategory}</Badge>
                    <Badge tone={riskTone(fund.riskRating)}>{fund.riskRating} risk</Badge>
                    {fund.lockInYears > 0 && <Badge tone="amber"><Lock className="w-3 h-3" /> {fund.lockInYears}Y lock-in</Badge>}
                    <Stars n={fund.rating} />
                  </div>
                </div>
              </div>
              <button onClick={() => act({ type: 'TOGGLE_WATCHLIST', key: fund.id }, watched ? 'Removed from watchlist' : 'Added to watchlist')} className="p-2 rounded-xl border border-slate-200 hover:border-emerald-400" aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}>
                {watched ? <BookmarkCheck className="w-5 h-5 text-emerald-600" /> : <Bookmark className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <span className="text-3xl font-bold text-slate-900">{formatPct(fund.cagr3y, 1, false)}</span>
                <span className="text-sm text-slate-500 ml-1">3Y annualised</span>
              </div>
              <div className="text-sm text-slate-600">
                NAV <b className="tabular-nums">{formatINR(fund.nav, 4)}</b> <Change pct={dayPct} showAbs={false} className="text-xs" />
              </div>
            </div>
            <div className="mt-4">
              <PriceChart seedKey={fund.id} endValue={fund.nav} drift={fund.cagr3y} vol={fund.volatility} endDate={state.simDate} ranges={['1M', '6M', '1Y', '3Y', '5Y']} defaultRange="3Y" />
            </div>
          </Card>

          {h && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800">Your investment</h2>
                <Button variant="outline" size="sm" onClick={() => setRedeemOpen(true)}>Redeem</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label="Current value" value={formatINR(h.quantity * fund.nav)} />
                <Stat label="Invested" value={formatINR(h.investedAmount)} />
                <Stat label="Returns" value={formatINR(h.quantity * fund.nav - h.investedAmount)} sub={<Change pct={((h.quantity * fund.nav - h.investedAmount) / h.investedAmount) * 100} showAbs={false} />} />
                <Stat label="Units" value={formatNumber(h.quantity, 3)} sub={<span className="text-slate-400">Avg NAV {formatNumber(h.avgPrice, 2)}</span>} />
              </div>
              {sips.length > 0 && <p className="text-xs text-slate-500 mt-3">{sips.length} SIP(s) active on this fund — manage them under Portfolio → SIPs.</p>}
              <RedeemModal key={String(redeemOpen)} fund={fund} open={redeemOpen} onClose={() => setRedeemOpen(false)} />
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-bold text-slate-800 mb-3">Returns vs category average</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 text-left">
                    <th className="py-1 font-semibold">Name</th><th className="font-semibold text-right">1Y</th><th className="font-semibold text-right">3Y</th><th className="font-semibold text-right">5Y</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr><td className="py-1.5 font-semibold">This fund</td><td className="text-right"><Change pct={fund.cagr1y} showAbs={false} /></td><td className="text-right"><Change pct={fund.cagr3y} showAbs={false} /></td><td className="text-right">{fund.cagr5y ? <Change pct={fund.cagr5y} showAbs={false} /> : '—'}</td></tr>
                  <tr className="text-slate-500"><td className="py-1.5">{fund.subCategory} avg.</td><td className="text-right">{formatPct(avg('cagr1y'))}</td><td className="text-right">{formatPct(avg('cagr3y'))}</td><td className="text-right">{formatPct(avg('cagr5y'))}</td></tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-800 mb-4">Fund details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Stat label="Expense ratio" value={`${fund.expenseRatio.toFixed(2)}%`} />
              <Stat label="Fund size (AUM)" value={formatCrore(fund.aumCr)} />
              <Stat label="Min. SIP / Lumpsum" value={`${formatINR(fund.minSip, 0)} / ${formatINR(fund.minLumpsum, 0)}`} />
              <Stat label="Exit load" value={fund.exitLoadPct ? `${fund.exitLoadPct}% if redeemed within ${fund.exitLoadDays} days` : 'Nil'} />
              <Stat label="Lock-in" value={fund.lockInYears ? `${fund.lockInYears} years` : 'None'} />
              <Stat label="Benchmark" value={fund.benchmark} />
              <Stat label="Fund manager(s)" value={fund.managers.join(', ')} />
              <Stat label="AMC" value={fund.amc} />
              <Stat label="Volatility" value={`${fund.volatility}%`} />
            </div>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed">{fund.description}</p>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-800 mb-3">Top holdings</h2>
            <div className="space-y-2">
              {fund.holdings.map((x) => (
                <div key={x.name}>
                  <div className="flex justify-between text-sm"><span className="text-slate-700">{x.name}</span><span className="font-semibold tabular-nums">{x.percentage.toFixed(1)}%</span></div>
                  <div className="h-1.5 rounded-full bg-slate-100 mt-1"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, x.percentage * 3)}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Disclaimer />
        </div>
        <div className="space-y-4 lg:sticky lg:top-36 self-start">
          <InvestPanel key={fund.id} fund={fund} />
          <ReturnCalculator fund={fund} />
        </div>
      </div>
    </div>
  );
}

export function FundRow({ fund, onClick }: { fund: MutualFund; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_70px_70px_70px_90px] items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <Logo name={fund.amc} />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">{fund.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-500">{fund.subCategory}</span>
            <Badge tone={riskTone(fund.riskRating)} className="!text-[10px]">{fund.riskRating}</Badge>
            <Stars n={fund.rating} />
          </div>
        </div>
      </div>
      <div className="hidden sm:block text-right text-sm"><Change pct={fund.cagr1y} showAbs={false} decimals={1} /></div>
      <div className="text-right text-sm">
        <Change pct={fund.cagr3y} showAbs={false} />
        <div className="sm:hidden text-[10px] text-slate-400">3Y</div>
      </div>
      <div className="hidden sm:block text-right text-sm">{fund.cagr5y ? <Change pct={fund.cagr5y} showAbs={false} /> : <span className="text-slate-400">—</span>}</div>
      <div className="hidden sm:block text-right text-xs text-slate-500 tabular-nums">{formatCrore(fund.aumCr)}</div>
    </button>
  );
}

export default function FundsTab() {
  const { state } = useStore();
  const nav = useNav();
  const [cat, setCat] = useState<'All' | FundCategory>('All');
  const [sub, setSub] = useState('All');
  const [sort, setSort] = useState<SortKey>('cagr3y');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const selected = nav.fundId ? state.funds.find((f) => f.id === nav.fundId) : undefined;
  const subs = useMemo(() => Array.from(new Set(state.funds.filter((f) => cat === 'All' || f.category === cat).map((f) => f.subCategory))).sort(), [state.funds, cat]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.funds.filter((f) => (cat === 'All' || f.category === cat) && (sub === 'All' || f.subCategory === sub) && (!q || f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q)));
    const s: Record<SortKey, (a: MutualFund, b: MutualFund) => number> = {
      cagr3y: (a, b) => b.cagr3y - a.cagr3y,
      cagr1y: (a, b) => b.cagr1y - a.cagr1y,
      cagr5y: (a, b) => b.cagr5y - a.cagr5y,
      aum: (a, b) => b.aumCr - a.aumCr,
      expense: (a, b) => a.expenseRatio - b.expenseRatio,
      rating: (a, b) => b.rating - a.rating || b.cagr3y - a.cagr3y,
    };
    return list.sort(s[sort]);
  }, [state.funds, cat, sub, sort, query]);

  if (selected) return <FundDetail fund={selected} />;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const amcs = new Set(state.funds.map((f) => f.amc)).size;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mutual Funds</h1>
        <p className="text-sm text-slate-500">{state.funds.length} direct-plan schemes from {amcs} AMCs across {subs.length} {cat === 'All' ? '' : `${cat} `}categories</p>
      </div>
      <Card className="p-4 space-y-3">
        <Pills options={['All', ...FUND_CATEGORIES] as ('All' | FundCategory)[]} value={cat} onChange={(v) => { setCat(v); setSub('All'); setPage(1); }} />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={cn(inputClass, 'pl-9 font-normal')} placeholder="Filter by fund or AMC" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Filter funds" />
          </div>
          <select className={inputClass} value={sub} onChange={(e) => { setSub(e.target.value); setPage(1); }} aria-label="Sub-category">
            <option value="All">All sub-categories</option>
            {subs.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort funds">
            <option value="cagr3y">3Y returns: high to low</option>
            <option value="cagr1y">1Y returns: high to low</option>
            <option value="cagr5y">5Y returns: high to low</option>
            <option value="aum">Fund size: high to low</option>
            <option value="expense">Expense ratio: low to high</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_70px_70px_70px_90px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
          <span>Fund</span><span className="text-right">1Y</span><span className="text-right">3Y</span><span className="text-right">5Y</span><span className="text-right">AUM</span>
        </div>
        {filtered.length === 0 ? <EmptyState title="No funds match your filters" /> : (
          <div className="divide-y divide-slate-100">
            {filtered.slice((current - 1) * PAGE, current * PAGE).map((f) => <FundRow key={f.id} fund={f} onClick={() => nav.openFund(f.id)} />)}
          </div>
        )}
        <Pager page={current} pages={pages} onChange={setPage} />
      </Card>
      <Disclaimer />
    </div>
  );
}
