import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Briefcase, Download, Pause, Play, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { fnoView, holdingsOfType, HoldingView, portfolioSummary } from '../store/selectors';
import { sipInstallmentAmount } from '../store/reducer';
import { AssetType, Sip } from '../types';
import { contractLabel } from '../lib/fno';
import { formatDate, formatINR, formatNumber, formatPct } from '../lib/format';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Field, inputClass, Modal, NumberInput, Pills, Stat } from './common/ui';

type View = 'Holdings' | 'SIPs' | 'Orders' | 'Transactions';
const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b'];

function HoldingsTable({ type }: { type: AssetType }) {
  const { state } = useStore();
  const nav = useNav();
  const rows = holdingsOfType(state, type).sort((a, b) => b.currentValue - a.currentValue);
  if (!rows.length) return <EmptyState icon={<Briefcase className="w-5 h-5" />} title="No holdings yet" text={type === 'stock' ? 'Buy stocks or ETFs to see them here.' : type === 'mf' ? 'Invest in a mutual fund to get started.' : 'Buy G-Secs, SGBs or corporate bonds.'} action={<Button size="sm" onClick={() => nav.setTab(type === 'stock' ? 'stocks' : type === 'mf' ? 'funds' : 'bonds')}>Explore</Button>} />;
  const open = (r: HoldingView) => (type === 'stock' ? nav.openStock(r.holding.assetId) : type === 'mf' ? nav.openFund(r.holding.assetId) : nav.setTab('bonds'));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-slate-400 text-left"><th className="py-2 px-4 font-semibold">Name</th><th className="font-semibold text-right">{type === 'mf' ? 'Units' : 'Qty'}</th><th className="font-semibold text-right">Avg</th><th className="font-semibold text-right">LTP</th><th className="font-semibold text-right">Current</th><th className="font-semibold text-right px-4">Returns</th></tr></thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.holding.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => open(r)}>
              <td className="py-2.5 px-4"><div className="font-semibold text-slate-800">{r.name}</div><div className="text-xs text-slate-500">{r.subtitle}</div></td>
              <td className="text-right">{formatNumber(r.holding.quantity, type === 'mf' ? 3 : 0)}</td>
              <td className="text-right">{formatNumber(r.holding.avgPrice)}</td>
              <td className="text-right">{formatNumber(r.currentPrice)}</td>
              <td className="text-right font-semibold">{formatINR(r.currentValue)}</td>
              <td className="text-right px-4"><div className={cn('font-semibold', r.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatINR(r.pnl)}</div><Change pct={r.pnlPct} showAbs={false} className="text-xs" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FnoHoldings() {
  const { state, act } = useStore();
  const nav = useNav();
  if (!state.fnoPositions.length) return <EmptyState title="No open F&O positions" action={<Button size="sm" onClick={() => nav.setTab('fno')}>Open option chain</Button>} />;
  return (
    <div className="divide-y divide-slate-100">
      {state.fnoPositions.map((p) => {
        const v = fnoView(state, p);
        return (
          <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div><div className="font-semibold">{contractLabel(p)}</div><div className="text-xs text-slate-500"><Badge tone={p.side === 'BUY' ? 'green' : 'red'}>{p.side}</Badge> {p.lots} lot(s) · avg {formatNumber(p.avgPrice)} · LTP {formatNumber(v.ltp)}</div></div>
            <div className="flex items-center gap-3">
              <span className={cn('font-semibold tabular-nums', v.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatINR(v.pnl)}</span>
              <Button size="sm" variant="outline" onClick={() => act({ type: 'FNO_CLOSE', positionId: p.id }, `Exited ${contractLabel(p)}`)}>Exit</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditSipModal({ sip, onClose }: { sip: Sip; onClose: () => void }) {
  const { act } = useStore();
  const [amount, setAmount] = useState(sip.amount);
  const [day, setDay] = useState(sip.dayOfMonth);
  const [stepUp, setStepUp] = useState(sip.stepUpPercent);
  const save = () => {
    if (act({ type: 'SIP_UPDATE', sipId: sip.id, changes: { amount, dayOfMonth: day !== sip.dayOfMonth ? day : undefined, stepUpPercent: stepUp } }, 'SIP updated')) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Modify SIP">
      <div className="space-y-3">
        <Field label="Monthly amount"><NumberInput value={amount} onChange={setAmount} prefix="₹" /></Field>
        <Field label="SIP date"><select className={inputClass} value={day} onChange={(e) => setDay(Number(e.target.value))}>{Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Annual step-up"><select className={inputClass} value={stepUp} onChange={(e) => setStepUp(Number(e.target.value))}>{[0, 5, 10, 15, 20].map((v) => <option key={v} value={v}>{v}%</option>)}</select></Field>
      </div>
      <Button size="lg" className="w-full mt-4" onClick={save}>Save changes</Button>
    </Modal>
  );
}

function SipList() {
  const { state, act } = useStore();
  const nav = useNav();
  const [editing, setEditing] = useState<Sip | null>(null);
  if (!state.sips.length) return <EmptyState title="No SIPs" text="Start a SIP from any mutual fund page." action={<Button size="sm" onClick={() => nav.setTab('funds')}>Explore funds</Button>} />;
  const monthly = state.sips.filter((s) => s.status === 'ACTIVE').reduce((a, s) => a + sipInstallmentAmount(s), 0);
  return (
    <div>
      <div className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">Monthly SIP commitment: <b className="tabular-nums">{formatINR(monthly, 0)}</b></div>
      <div className="divide-y divide-slate-100">
        {state.sips.map((s) => {
          const f = state.funds.find((x) => x.id === s.fundId);
          return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button className="text-left min-w-0" onClick={() => f && nav.openFund(f.id)}>
                <div className="font-semibold text-sm text-slate-800">{f?.name}</div>
                <div className="text-xs text-slate-500">
                  {formatINR(sipInstallmentAmount(s), 0)} on day {s.dayOfMonth} · {s.installments} instalment(s){s.stepUpPercent ? ` · ${s.stepUpPercent}% annual step-up` : ''} · next {formatDate(s.nextDate)}
                </div>
              </button>
              <div className="flex items-center gap-1.5">
                <Badge tone={s.status === 'ACTIVE' ? 'green' : 'amber'}>{s.status === 'ACTIVE' ? 'Active' : 'Paused'}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                <Button size="sm" variant="ghost" aria-label={s.status === 'ACTIVE' ? 'Pause SIP' : 'Resume SIP'} onClick={() => act({ type: 'SIP_UPDATE', sipId: s.id, changes: { status: s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } }, s.status === 'ACTIVE' ? 'SIP paused' : 'SIP resumed')}>
                  {s.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" aria-label="Cancel SIP" onClick={() => window.confirm('Cancel this SIP? Existing units remain invested.') && act({ type: 'SIP_CANCEL', sipId: s.id }, 'SIP cancelled')}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <EditSipModal sip={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Orders() {
  const { state, act } = useStore();
  if (!state.pendingOrders.length) return <EmptyState title="No open orders" text="Limit orders that haven't executed yet will appear here. Day orders expire at market close." />;
  return (
    <div className="divide-y divide-slate-100">
      {state.pendingOrders.map((o) => {
        const s = state.stocks.find((x) => x.id === o.stockId);
        return (
          <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div><div className="font-semibold"><Badge tone={o.side === 'BUY' ? 'green' : 'red'}>{o.side}</Badge> {s?.ticker} × {o.quantity}</div><div className="text-xs text-slate-500">Limit {formatINR(o.limitPrice)} · LTP {s && formatINR(s.price)}</div></div>
            <Button size="sm" variant="outline" onClick={() => act({ type: 'CANCEL_ORDER', orderId: o.id }, 'Order cancelled')}>Cancel</Button>
          </div>
        );
      })}
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { BUY: 'Buy', SELL: 'Sell', LIMIT_PLACED: 'Limit placed', LIMIT_CANCELLED: 'Order cancelled', SIP: 'SIP', LUMPSUM: 'Lumpsum', REDEEM: 'Redeem', DEPOSIT: 'Deposit', WITHDRAW: 'Withdraw', FNO_OPEN: 'F&O open', FNO_CLOSE: 'F&O exit', FNO_SETTLE: 'Expiry settle', COUPON: 'Coupon', MATURITY: 'Maturity', IPO_APPLY: 'IPO apply', IPO_ALLOT: 'IPO allotted', IPO_REFUND: 'IPO refund', SIP_FAILED: 'SIP failed' };

function Transactions() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'All' | 'Stocks' | 'Funds' | 'F&O' | 'Bonds' | 'Wallet'>('All');
  const map = { Stocks: 'stock', Funds: 'mf', 'F&O': 'fno', Bonds: 'bond', Wallet: 'cash' } as const;
  const list = state.transactions.filter((t) => filter === 'All' || t.assetType === map[filter] || (filter === 'Stocks' && t.assetType === 'ipo'));
  const exportCsv = () => {
    const rows = [['Date', 'Type', 'Instrument', 'Qty', 'Price', 'Amount', 'Note'], ...list.map((t) => [t.date, KIND_LABEL[t.kind], t.name, t.quantity ?? '', t.price ?? '', t.amount, t.note ?? ''])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wealthwise-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <Pills options={['All', 'Stocks', 'Funds', 'F&O', 'Bonds', 'Wallet'] as const} value={filter} onChange={setFilter} size="sm" />
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 inline mr-1" />CSV</Button>
      </div>
      {list.length === 0 ? <EmptyState title="No transactions" /> : (
        <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
          {list.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{t.name}</div>
                <div className="text-xs text-slate-500">{formatDate(t.date)} · {KIND_LABEL[t.kind]}{t.quantity ? ` · ${formatNumber(t.quantity, t.assetType === 'mf' ? 3 : 0)} @ ${formatNumber(t.price ?? 0)}` : ''}{t.note ? ` · ${t.note}` : ''}</div>
              </div>
              <span className={cn('font-semibold tabular-nums shrink-0', t.amount > 0 ? 'text-emerald-600' : t.amount < 0 ? 'text-slate-800' : 'text-slate-400')}>{t.amount > 0 ? '+' : ''}{formatINR(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioTab() {
  const { state, act } = useStore();
  const [view, setView] = useState<View>('Holdings');
  const [cls, setCls] = useState<'Stocks' | 'Mutual Funds' | 'Bonds' | 'F&O'>('Stocks');
  const s = portfolioSummary(state);
  const pie = [...s.byClass.filter((c) => c.current > 0).map((c) => ({ name: c.name, value: Math.round(c.current) })), { name: 'Cash', value: Math.round(s.cash + s.blockedCash) }];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Portfolio</h1>
        <Button size="sm" variant="ghost" onClick={() => window.confirm('Reset the simulator? All holdings and history will be cleared.') && act({ type: 'RESET' }, 'Simulator reset with ₹10,00,000 virtual cash')}>Reset simulator</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Net worth" value={formatINR(s.netWorth, 0)} />
            <Stat label="Invested" value={formatINR(s.invested, 0)} />
            <Stat label="Current value" value={formatINR(s.current, 0)} />
            <Stat label="Total returns" value={<span className={s.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatINR(s.pnl, 0)}</span>} sub={<Change pct={s.pnlPct} showAbs={false} />} />
            <Stat label="1D returns" value={<span className={s.dayChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatINR(s.dayChange, 0)}</span>} />
            <Stat label="Wallet" value={formatINR(s.cash, 0)} />
            <Stat label="F&O unrealised" value={<span className={s.fnoPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatINR(s.fnoPnl, 0)}</span>} />
            <Stat label="Blocked" value={formatINR(s.blockedCash, 0)} />
          </div>
          <div className="mt-5 space-y-2">
            {s.byClass.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.name}</span>
                <span className="tabular-nums">{formatINR(c.current, 0)} <span className={cn('text-xs', c.current >= c.invested ? 'text-emerald-600' : 'text-rose-600')}>({c.invested ? formatPct(((c.current - c.invested) / c.invested) * 100) : '—'})</span></span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-slate-800 mb-2">Asset allocation</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(Number(v), 0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {pie.map((p, i) => (
              <div key={p.name} className="flex justify-between"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</span><span className="tabular-nums">{s.netWorth ? ((p.value / s.netWorth) * 100).toFixed(1) : 0}%</span></div>
            ))}
          </div>
        </Card>
      </div>

      <Pills options={['Holdings', 'SIPs', 'Orders', 'Transactions'] as const} value={view} onChange={setView} />
      <Card className="overflow-hidden">
        {view === 'Holdings' && (
          <>
            <div className="px-4 py-3 border-b border-slate-100">
              <Pills options={['Stocks', 'Mutual Funds', 'Bonds', 'F&O'] as const} value={cls} onChange={setCls} size="sm" />
            </div>
            {cls === 'Stocks' && <HoldingsTable type="stock" />}
            {cls === 'Mutual Funds' && <HoldingsTable type="mf" />}
            {cls === 'Bonds' && <HoldingsTable type="bond" />}
            {cls === 'F&O' && <FnoHoldings />}
          </>
        )}
        {view === 'SIPs' && <SipList />}
        {view === 'Orders' && <Orders />}
        {view === 'Transactions' && <Transactions />}
      </Card>
      <Disclaimer />
    </div>
  );
}
