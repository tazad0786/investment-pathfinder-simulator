import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Layers } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { FNO_UNDERLYINGS } from '../data/markets';
import { FnoKind, FnoUnderlying, TradeSide } from '../types';
import { atmStrike, contractLabel, contractLtp, futuresPrice, getExpiries, marginFor, openCashFlow, optionQuote, payoffAtExpiry, strikesAround, syntheticOi, underlyingPrevClose, underlyingSpot } from '../lib/fno';
import { fnoView } from '../store/selectors';
import { formatDate, formatINR, formatNumber, formatShortDate } from '../lib/format';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Field, inputClass, Modal, NumberInput, Pills, Stat } from './common/ui';

interface Ticket {
  kind: FnoKind;
  strike: number;
  side: TradeSide;
}

function OrderTicket({ u, expiry, ticket, onClose }: { u: FnoUnderlying; expiry: string; ticket: Ticket; onClose: () => void }) {
  const { state, act } = useStore();
  const [side, setSide] = useState<TradeSide>(ticket.side);
  const [lots, setLots] = useState(1);
  const spot = underlyingSpot(u, state.indices, state.stocks);
  const price = contractLtp(u, ticket.kind, ticket.strike, expiry, spot, state.simDate);
  const qty = (Number.isFinite(lots) ? lots : 0) * u.lotSize;
  const margin = marginFor(ticket.kind, side, spot, qty);
  const required = -openCashFlow(ticket.kind, side, price, qty, margin);
  const label = contractLabel({ underlying: u.symbol, kind: ticket.kind, strike: ticket.strike, expiry });
  const q = ticket.kind !== 'FUT' ? optionQuote(u, ticket.kind, spot, ticket.strike, expiry, state.simDate) : null;

  const submit = () => {
    if (act({ type: 'FNO_OPEN', underlying: u.symbol, kind: ticket.kind, strike: ticket.strike, expiry, side, lots }, `${side} ${lots} lot(s) ${label} @ ${formatINR(price)}`)) onClose();
  };

  return (
    <Modal open onClose={onClose} title={label}>
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-4">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} className={cn('py-2 rounded-lg text-sm font-bold', side === s ? (s === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'text-slate-500')}>
            {s === 'BUY' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <Stat label="LTP" value={formatINR(price)} />
        <Stat label="Lot size" value={u.lotSize} />
        <Stat label="Spot" value={formatNumber(spot)} />
        {q && (
          <>
            <Stat label="IV" value={`${q.iv.toFixed(1)}%`} />
            <Stat label="Delta" value={q.delta.toFixed(2)} />
            <Stat label="Theta / day" value={q.theta.toFixed(2)} />
          </>
        )}
      </div>
      <Field label="Lots" hint={`Quantity: ${qty}`}>
        <NumberInput value={lots} onChange={(v) => setLots(Math.floor(v))} min={1} step={1} />
      </Field>
      <div className="rounded-xl bg-slate-50 p-3 mt-4 text-sm space-y-1">
        {ticket.kind !== 'FUT' && <div className="flex justify-between"><span className="text-slate-500">Premium {side === 'BUY' ? 'payable' : 'receivable'}</span><span className="font-semibold tabular-nums">{formatINR(price * qty)}</span></div>}
        {margin > 0 && <div className="flex justify-between"><span className="text-slate-500">Margin blocked (~{(13).toFixed(0)}% of notional)</span><span className="font-semibold tabular-nums">{formatINR(margin)}</span></div>}
        <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-semibold text-slate-700">Net required</span><span className="font-bold tabular-nums">{formatINR(Math.max(0, required))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Available</span><span className="tabular-nums">{formatINR(state.balance)}</span></div>
      </div>
      {side === 'SELL' && ticket.kind !== 'FUT' && (
        <p className="flex gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-3"><AlertTriangle className="w-4 h-4 shrink-0" /> Option selling has limited profit and potentially unlimited loss.</p>
      )}
      <Button variant={side === 'BUY' ? 'primary' : 'danger'} size="lg" className="w-full mt-4" onClick={submit}>
        {side === 'BUY' ? 'Buy' : 'Sell'} {lots} lot(s)
      </Button>
    </Modal>
  );
}

function Positions() {
  const { state, act } = useStore();
  const views = state.fnoPositions.map((p) => fnoView(state, p));
  const total = views.reduce((a, v) => a + v.pnl, 0);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800">Open positions</h2>
        {views.length > 0 && <span className="text-sm">Total P&L <span className={cn('font-bold tabular-nums', total >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatINR(total)}</span></span>}
      </div>
      {views.length === 0 ? (
        <EmptyState icon={<Layers className="w-5 h-5" />} title="No open F&O positions" text="Tap any LTP in the option chain or a futures contract to trade." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-400 text-left"><th className="py-1 font-semibold">Contract</th><th className="font-semibold">Side</th><th className="font-semibold text-right">Qty</th><th className="font-semibold text-right">Avg</th><th className="font-semibold text-right">LTP</th><th className="font-semibold text-right">P&L</th><th /></tr></thead>
            <tbody className="tabular-nums">
              {views.map(({ position: p, ltp, pnl }) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold whitespace-nowrap">{contractLabel(p)}</td>
                  <td><Badge tone={p.side === 'BUY' ? 'green' : 'red'}>{p.side}</Badge></td>
                  <td className="text-right">{p.lots * p.lotSize}</td>
                  <td className="text-right">{formatNumber(p.avgPrice)}</td>
                  <td className="text-right">{formatNumber(ltp)}</td>
                  <td className={cn('text-right font-semibold', pnl >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatINR(pnl)}</td>
                  <td className="text-right"><Button size="sm" variant="outline" onClick={() => act({ type: 'FNO_CLOSE', positionId: p.id }, `Exited ${contractLabel(p)} @ ${formatINR(ltp)}`)}>Exit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3">Open contracts are cash-settled at intrinsic value on expiry when you advance the simulation past the expiry date.</p>
    </Card>
  );
}

function PayoffChart({ symbol, spot }: { symbol: string; spot: number }) {
  const { state } = useStore();
  const positions = state.fnoPositions.filter((p) => p.underlying === symbol);
  const data = useMemo(() => {
    const grid = Array.from({ length: 41 }, (_, i) => spot * (0.88 + (i * 0.24) / 40));
    return payoffAtExpiry(positions, grid);
  }, [positions, spot]);
  if (!positions.length) return null;
  const max = Math.max(...data.map((d) => d.pnl));
  const min = Math.min(...data.map((d) => d.pnl));
  return (
    <Card className="p-5">
      <h2 className="font-bold text-slate-800 mb-1">Payoff at expiry · {symbol}</h2>
      <div className="flex gap-4 text-xs text-slate-500 mb-3">
        <span>Max profit (in range): <b className="text-emerald-600">{formatINR(max, 0)}</b></span>
        <span>Max loss (in range): <b className="text-rose-600">{formatINR(min, 0)}</b></span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="spot" tick={{ fontSize: 10 }} minTickGap={30} />
            <YAxis tick={{ fontSize: 10 }} width={70} tickFormatter={(v: number) => formatNumber(v, 0)} />
            <Tooltip formatter={(v) => [formatINR(Number(v), 0), 'P&L']} labelFormatter={(l) => `Spot ${l}`} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <ReferenceLine x={Math.round(spot)} stroke="#0ea5e9" strokeDasharray="4 4" label={{ value: 'Spot', fontSize: 10, fill: '#0ea5e9' }} />
            <Line type="linear" dataKey="pnl" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function FnoTab() {
  const { state } = useStore();
  const nav = useNav();
  const [symbol, setSymbol] = useState(nav.fnoSymbol ?? 'NIFTY');
  useEffect(() => {
    if (nav.fnoSymbol) setSymbol(nav.fnoSymbol);
  }, [nav.fnoSymbol]);
  const u = FNO_UNDERLYINGS.find((x) => x.symbol === symbol) ?? FNO_UNDERLYINGS[0];
  const expiries = getExpiries(u, state.simDate);
  const [expiryChoice, setExpiry] = useState<string | null>(null);
  const expiry = expiryChoice && expiries.includes(expiryChoice) ? expiryChoice : expiries[0];
  const [view, setView] = useState<'Options' | 'Futures'>('Options');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const spot = underlyingSpot(u, state.indices, state.stocks);
  const prev = underlyingPrevClose(u, state.indices, state.stocks);
  const atm = atmStrike(spot, u.strikeStep);
  const strikes = strikesAround(spot, u.strikeStep, 10);
  const monthlyExpiries = expiries.filter((e, i) => !u.weekly || i >= expiries.length - 3 || e === expiries[expiries.length - 1]).slice(-3);

  const chain = strikes.map((k) => ({
    strike: k,
    ce: optionQuote(u, 'CE', spot, k, expiry, state.simDate),
    pe: optionQuote(u, 'PE', spot, k, expiry, state.simDate),
    ceOi: syntheticOi(u, 'CE', k, spot, expiry),
    peOi: syntheticOi(u, 'PE', k, spot, expiry),
  }));
  const totalCeOi = chain.reduce((a, r) => a + r.ceOi, 0);
  const totalPeOi = chain.reduce((a, r) => a + r.peOi, 0);
  const maxOi = Math.max(...chain.map((r) => Math.max(r.ceOi, r.peOi)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Futures & Options</h1>
        <p className="text-sm text-slate-500">Index and stock derivatives priced with Black-Scholes. {FNO_UNDERLYINGS.length} underlyings.</p>
      </div>
      <Card className="p-4 space-y-3">
        <Pills options={FNO_UNDERLYINGS.map((x) => ({ id: x.symbol, label: x.symbol }))} value={u.symbol} onChange={(v) => { setSymbol(v); setExpiry(null); }} size="sm" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">{u.name} · spot</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{formatNumber(spot)}</span>
              <Change value={spot - prev} pct={((spot - prev) / prev) * 100} className="text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Lot size" value={u.lotSize} />
            <Stat label="ATM IV" value={`${u.baseIv.toFixed(1)}%`} />
            <Stat label="PCR (OI)" value={(totalPeOi / totalCeOi).toFixed(2)} />
            <Stat label="Expiry" value={u.weekly ? 'Weekly + Monthly' : 'Monthly'} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Pills options={['Options', 'Futures'] as const} value={view} onChange={setView} size="sm" />
          {view === 'Options' && (
            <select className={cn(inputClass, 'w-auto')} value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Expiry">
              {expiries.map((e) => <option key={e} value={e}>{formatDate(e)}</option>)}
            </select>
          )}
        </div>
      </Card>

      {view === 'Options' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm tabular-nums">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th colSpan={4} className="py-2 font-semibold text-center border-r border-slate-200">CALLS</th>
                  <th className="py-2 font-semibold">Strike</th>
                  <th colSpan={4} className="py-2 font-semibold text-center border-l border-slate-200">PUTS</th>
                </tr>
                <tr className="text-[11px] text-slate-400">
                  <th className="py-1 px-2 font-semibold text-left">OI</th><th className="font-semibold">IV</th><th className="font-semibold">Δ</th><th className="font-semibold border-r border-slate-200">LTP</th>
                  <th />
                  <th className="font-semibold border-l border-slate-200">LTP</th><th className="font-semibold">Δ</th><th className="font-semibold">IV</th><th className="px-2 font-semibold text-right">OI</th>
                </tr>
              </thead>
              <tbody>
                {chain.map((r) => {
                  const ceItm = r.strike < spot;
                  const peItm = r.strike > spot;
                  return (
                    <tr key={r.strike} className={cn('border-t border-slate-100', r.strike === atm && 'outline outline-1 outline-sky-300')}>
                      <td className={cn('py-1.5 px-2 relative', ceItm && 'bg-amber-50/60')}>
                        <div className="absolute inset-y-1 right-0 bg-emerald-100/70 rounded-l" style={{ width: `${(r.ceOi / maxOi) * 100}%` }} />
                        <span className="relative">{(r.ceOi / 1000).toFixed(1)}K</span>
                      </td>
                      <td className={cn('text-center', ceItm && 'bg-amber-50/60')}>{r.ce.iv.toFixed(1)}</td>
                      <td className={cn('text-center', ceItm && 'bg-amber-50/60')}>{r.ce.delta.toFixed(2)}</td>
                      <td className={cn('text-center border-r border-slate-200', ceItm && 'bg-amber-50/60')}>
                        <button onClick={() => setTicket({ kind: 'CE', strike: r.strike, side: 'BUY' })} className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline px-1">{formatNumber(r.ce.ltp)}</button>
                      </td>
                      <td className="text-center font-bold bg-slate-50 px-2">{r.strike}</td>
                      <td className={cn('text-center border-l border-slate-200', peItm && 'bg-amber-50/60')}>
                        <button onClick={() => setTicket({ kind: 'PE', strike: r.strike, side: 'BUY' })} className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline px-1">{formatNumber(r.pe.ltp)}</button>
                      </td>
                      <td className={cn('text-center', peItm && 'bg-amber-50/60')}>{r.pe.delta.toFixed(2)}</td>
                      <td className={cn('text-center', peItm && 'bg-amber-50/60')}>{r.pe.iv.toFixed(1)}</td>
                      <td className={cn('py-1.5 px-2 text-right relative', peItm && 'bg-amber-50/60')}>
                        <div className="absolute inset-y-1 left-0 bg-rose-100/70 rounded-r" style={{ width: `${(r.peOi / maxOi) * 100}%` }} />
                        <span className="relative">{(r.peOi / 1000).toFixed(1)}K</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">Shaded cells are in-the-money. Click an LTP to buy or sell. Expiry {formatDate(expiry)}.</div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {monthlyExpiries.map((e) => {
              const fp = futuresPrice(spot, state.simDate, e);
              return (
                <div key={e} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold">{u.symbol} {formatShortDate(e)} FUT</div>
                  <div className="text-xl font-bold tabular-nums mt-1">{formatNumber(fp)}</div>
                  <div className="text-xs text-slate-500">Basis {formatNumber(fp - spot)} · Margin ~{formatINR(marginFor('FUT', 'BUY', spot, u.lotSize), 0)}/lot</div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Button size="sm" onClick={() => { setExpiry(e); setTicket({ kind: 'FUT', strike: 0, side: 'BUY' }); }}>Buy</Button>
                    <Button size="sm" variant="danger" onClick={() => { setExpiry(e); setTicket({ kind: 'FUT', strike: 0, side: 'SELL' }); }}>Sell</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Positions />
      <PayoffChart symbol={u.symbol} spot={spot} />
      {ticket && <OrderTicket u={u} expiry={expiry} ticket={ticket} onClose={() => setTicket(null)} />}
      <Disclaimer />
      <p className="text-[11px] text-slate-400">SEBI study: 9 out of 10 individual F&O traders incurred net losses. This simulator is for learning only.</p>
    </div>
  );
}
