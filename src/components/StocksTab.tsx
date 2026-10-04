import { useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, Layers, Search } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { SECTORS } from '../data/stocks';
import { FNO_UNDERLYINGS } from '../data/markets';
import { Stock, TradeSide } from '../types';
import { formatCrore, formatINR, formatNumber, formatPct, formatVolume } from '../lib/format';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Field, inputClass, Logo, NumberInput, Pager, Pills, riskTone, Sparkline, Stat } from './common/ui';
import PriceChart from './common/PriceChart';

type CapFilter = 'All' | 'Large' | 'Mid' | 'Small' | 'ETF';
type SortKey = 'mcap' | 'gainers' | 'losers' | 'volume' | 'pe' | 'name';
const PAGE = 25;

function RangeBar({ low, high, value, label }: { low: number; high: number; value: number; label: string }) {
  const pct = high > low ? ((value - low) / (high - low)) * 100 : 50;
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-2 text-xs tabular-nums">
        <span className="text-slate-600">{formatNumber(low)}</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 relative">
          <div className="absolute -top-1 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-slate-700" style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 4px)` }} />
        </div>
        <span className="text-slate-600">{formatNumber(high)}</span>
      </div>
    </div>
  );
}

function OrderPanel({ stock }: { stock: Stock }) {
  const { state, act } = useStore();
  const [side, setSide] = useState<TradeSide>('BUY');
  const [type, setType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState(() => +stock.price.toFixed(1));
  const holding = state.holdings.find((h) => h.assetType === 'stock' && h.assetId === stock.id);
  const px = type === 'LIMIT' ? limit : stock.price;
  const est = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(px) ? px : 0);
  const maxBuy = Math.floor(state.balance / stock.price);

  const submit = () => {
    const what = `${side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${stock.ticker}`;
    const msg = type === 'MARKET' ? `${what} @ ${formatINR(stock.price)}` : `${side} limit order for ${qty} ${stock.ticker} @ ${formatINR(limit)} placed`;
    act({ type: 'STOCK_ORDER', stockId: stock.id, side, quantity: qty, orderType: type, limitPrice: type === 'LIMIT' ? limit : undefined }, msg);
  };

  return (
    <Card className="p-5 lg:sticky lg:top-36">
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-4">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} className={cn('py-2 rounded-lg text-sm font-bold', side === s ? (s === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-slate-500')}>
            {s === 'BUY' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>
      <Pills options={[{ id: 'MARKET', label: 'Market' }, { id: 'LIMIT', label: 'Limit' }] as const} value={type} onChange={setType} size="sm" className="mb-4" />
      <div className="space-y-3">
        <Field label="Quantity (shares)" hint={side === 'BUY' ? `Max ~${maxBuy} with available balance` : `You hold ${holding?.quantity ?? 0}`}>
          <NumberInput value={qty} onChange={(v) => setQty(Math.floor(v))} min={1} step={1} />
        </Field>
        {type === 'LIMIT' && (
          <Field label="Limit price" hint={`Circuit band ${formatNumber(stock.prevClose * 0.8)} – ${formatNumber(stock.prevClose * 1.2)} · day order`}>
            <NumberInput value={limit} onChange={setLimit} prefix="₹" step={0.05} />
          </Field>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">{side === 'BUY' ? 'Approx. required' : 'Approx. credit'}</span>
          <span className="font-bold tabular-nums">{formatINR(est)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Available balance</span>
          <span className="font-semibold tabular-nums">{formatINR(state.balance)}</span>
        </div>
      </div>
      <Button variant={side === 'BUY' ? 'primary' : 'danger'} size="lg" className="w-full mt-4" onClick={submit}>
        {side === 'BUY' ? 'Buy' : 'Sell'} {stock.ticker}
      </Button>
      {holding && (
        <div className="mt-4 border-t border-slate-100 pt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Shares held" value={holding.quantity} />
          <Stat label="Avg. price" value={formatINR(holding.avgPrice)} />
          <Stat label="Invested" value={formatINR(holding.investedAmount)} />
          <Stat
            label="Returns"
            value={formatINR(stock.price * holding.quantity - holding.investedAmount)}
            sub={<Change pct={((stock.price * holding.quantity - holding.investedAmount) / holding.investedAmount) * 100} showAbs={false} />}
          />
        </div>
      )}
    </Card>
  );
}

function StockDetail({ stock }: { stock: Stock }) {
  const { state, act } = useStore();
  const nav = useNav();
  const watched = state.watchlist.includes(stock.id);
  const pending = state.pendingOrders.filter((o) => o.stockId === stock.id);
  const fno = FNO_UNDERLYINGS.find((u) => u.refId === stock.id);
  const drift = stock.instrument === 'ETF' ? 11 : Math.min(28, Math.max(-6, stock.profitGrowth3y * 0.7));
  const peers = state.stocks.filter((s) => s.sector === stock.sector && s.id !== stock.id).sort((a, b) => b.marketCapCr - a.marketCapCr).slice(0, 5);

  return (
    <div className="space-y-4">
      <button onClick={() => nav.openStock(null)} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> All stocks
      </button>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Logo name={stock.name} />
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{stock.name}</h1>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge>NSE: {stock.ticker}</Badge>
                    <Badge tone="blue">{stock.instrument === 'ETF' ? 'ETF' : `${stock.capCategory} cap`}</Badge>
                    <Badge>{stock.sector}</Badge>
                    <Badge tone={riskTone(stock.risk)}>{stock.risk} risk</Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={() => act({ type: 'TOGGLE_WATCHLIST', key: stock.id }, watched ? 'Removed from watchlist' : 'Added to watchlist')}
                className="p-2 rounded-xl border border-slate-200 hover:border-emerald-400"
                aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {watched ? <BookmarkCheck className="w-5 h-5 text-emerald-600" /> : <Bookmark className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums text-slate-900">{formatINR(stock.price)}</span>
              <Change value={stock.change} pct={stock.changePercent} />
              <span className="text-xs text-slate-400">1D</span>
            </div>
            <div className="mt-4">
              <PriceChart seedKey={stock.id} endValue={stock.price} openValue={stock.dayOpen} drift={drift} vol={stock.volatility} endDate={state.simDate} defaultRange="1D" />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-800 mb-4">Performance</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <RangeBar label="Today's low / high" low={stock.dayLow} high={stock.dayHigh} value={stock.price} />
              <RangeBar label="52 week low / high" low={stock.week52Low} high={stock.week52High} value={stock.price} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
              <Stat label="Open" value={formatNumber(stock.dayOpen)} />
              <Stat label="Prev. close" value={formatNumber(stock.prevClose)} />
              <Stat label="Volume" value={formatVolume(stock.volume)} />
              <Stat label="Market cap" value={formatCrore(stock.marketCapCr)} />
            </div>
          </Card>

          {stock.instrument === 'EQ' && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-800 mb-4">Fundamentals</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <Stat label="P/E ratio" value={formatNumber(stock.peRatio)} />
                <Stat label="P/B ratio" value={formatNumber(stock.pbRatio)} />
                <Stat label="ROE" value={`${formatNumber(stock.roe)}%`} />
                <Stat label="EPS (TTM)" value={formatNumber(stock.eps)} />
                <Stat label="Debt to equity" value={formatNumber(stock.debtToEquity)} />
                <Stat label="Dividend yield" value={`${formatNumber(stock.dividendYield)}%`} />
                <Stat label="3Y profit growth" value={formatPct(stock.profitGrowth3y, 1)} />
                <Stat label="Volatility (ann.)" value={`${formatNumber(stock.volatility, 1)}%`} />
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-bold text-slate-800 mb-2">About {stock.name}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{stock.description}</p>
            {fno && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => nav.openFno(fno.symbol)}>
                <Layers className="w-3.5 h-3.5 inline mr-1" /> View {fno.symbol} futures & options
              </Button>
            )}
          </Card>

          {peers.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-slate-800 mb-3">Peers in {stock.sector}</h2>
              <div className="divide-y divide-slate-100">
                {peers.map((p) => (
                  <button key={p.id} onClick={() => nav.openStock(p.id)} className="w-full flex items-center justify-between py-2 text-left hover:bg-slate-50 px-1 rounded">
                    <span className="text-sm font-semibold text-slate-700">{p.name}</span>
                    <span className="text-sm tabular-nums">
                      {formatINR(p.price)} <Change pct={p.changePercent} showAbs={false} className="text-xs" />
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Disclaimer />
        </div>

        <div className="space-y-4">
          <OrderPanel key={stock.id} stock={stock} />
          {pending.length > 0 && (
            <Card className="p-4">
              <h3 className="font-bold text-sm text-slate-800 mb-2">Open orders</h3>
              {pending.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm py-1.5">
                  <span>
                    <Badge tone={o.side === 'BUY' ? 'green' : 'red'}>{o.side}</Badge> {o.quantity} @ {formatINR(o.limitPrice)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => act({ type: 'CANCEL_ORDER', orderId: o.id }, 'Order cancelled')}>
                    Cancel
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function StockRow({ stock, onClick }: { stock: Stock; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_90px_120px_110px] items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <Logo name={stock.name} />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">{stock.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {stock.ticker} · {stock.instrument === 'ETF' ? 'ETF' : stock.sector}
          </div>
        </div>
      </div>
      <Sparkline data={stock.sparkline} className="hidden sm:block" />
      <div className="text-right">
        <div className="font-semibold text-sm tabular-nums">{formatINR(stock.price)}</div>
        <Change value={stock.change} pct={stock.changePercent} className="text-xs" />
      </div>
      <div className="hidden sm:block text-right text-xs text-slate-500 tabular-nums">{formatCrore(stock.marketCapCr)}</div>
    </button>
  );
}

export default function StocksTab() {
  const { state } = useStore();
  const nav = useNav();
  const [cap, setCap] = useState<CapFilter>('All');
  const [sector, setSector] = useState('All');
  const [sort, setSort] = useState<SortKey>('mcap');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const selected = nav.stockId ? state.stocks.find((s) => s.id === nav.stockId) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.stocks.filter((s) => {
      if (cap === 'ETF' ? s.instrument !== 'ETF' : cap !== 'All' && (s.instrument !== 'EQ' || s.capCategory !== cap)) return false;
      if (sector !== 'All' && s.sector !== sector) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.ticker.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorters: Record<SortKey, (a: Stock, b: Stock) => number> = {
      mcap: (a, b) => b.marketCapCr - a.marketCapCr,
      gainers: (a, b) => b.changePercent - a.changePercent,
      losers: (a, b) => a.changePercent - b.changePercent,
      volume: (a, b) => b.volume * b.price - a.volume * a.price,
      pe: (a, b) => (a.peRatio || 9999) - (b.peRatio || 9999),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return list.sort(sorters[sort]);
  }, [state.stocks, cap, sector, sort, query]);

  if (selected) return <StockDetail stock={selected} />;

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const reset = () => setPage(1);
  const advancers = state.stocks.filter((s) => s.changePercent > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stocks & ETFs</h1>
          <p className="text-sm text-slate-500">
            {state.stocks.length} NSE instruments · <span className="text-emerald-600 font-semibold">{advancers} advancing</span> ·{' '}
            <span className="text-rose-600 font-semibold">{state.stocks.length - advancers} declining</span>
          </p>
        </div>
      </div>
      <Card className="p-4 space-y-3">
        <Pills options={['All', 'Large', 'Mid', 'Small', 'ETF'] as const} value={cap} onChange={(v) => { setCap(v); reset(); }} />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={cn(inputClass, 'pl-9 font-normal')} placeholder="Filter by name or symbol" value={query} onChange={(e) => { setQuery(e.target.value); reset(); }} aria-label="Filter stocks" />
          </div>
          <select className={inputClass} value={sector} onChange={(e) => { setSector(e.target.value); reset(); }} aria-label="Sector">
            <option value="All">All sectors</option>
            {SECTORS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className={inputClass} value={sort} onChange={(e) => { setSort(e.target.value as SortKey); reset(); }} aria-label="Sort by">
            <option value="mcap">Market cap: high to low</option>
            <option value="gainers">Top gainers</option>
            <option value="losers">Top losers</option>
            <option value="volume">Most traded (value)</option>
            <option value="pe">P/E: low to high</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_90px_120px_110px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100">
          <span>Company</span>
          <span>1M trend</span>
          <span className="text-right">Price</span>
          <span className="text-right">Market cap</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No instruments match your filters" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.slice((current - 1) * PAGE, current * PAGE).map((s) => (
              <StockRow key={s.id} stock={s} onClick={() => nav.openStock(s.id)} />
            ))}
          </div>
        )}
        <Pager page={current} pages={pages} onChange={setPage} />
      </Card>
      <Disclaimer />
    </div>
  );
}
