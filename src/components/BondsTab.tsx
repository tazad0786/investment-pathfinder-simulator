import { useMemo, useState } from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { BOND_TYPES, yearsBetween } from '../data/bonds';
import { Bond, BondType, TradeSide } from '../types';
import { formatDate, formatINR, formatNumber } from '../lib/format';
import { Badge, Button, Card, Change, cn, Disclaimer, EmptyState, Field, Modal, NumberInput, Pills, Stat } from './common/ui';

const FREQ: Record<number, string> = { 0: 'At maturity', 1: 'Annual', 2: 'Half-yearly', 4: 'Quarterly', 12: 'Monthly' };

function BondTicket({ bond, side: initialSide, onClose }: { bond: Bond; side: TradeSide; onClose: () => void }) {
  const { state, act } = useStore();
  const [side, setSide] = useState(initialSide);
  const [units, setUnits] = useState(bond.type === 'SGB' ? 5 : 10);
  const held = state.holdings.find((h) => h.assetType === 'bond' && h.assetId === bond.id)?.quantity ?? 0;
  const amount = (Number.isFinite(units) ? units : 0) * bond.price;
  const years = yearsBetween(state.simDate, bond.maturityDate);
  const couponIncome = bond.couponFrequency ? ((bond.faceValue * bond.couponRate) / 100) * units * years : 0;
  const redemption = (bond.type === 'SGB' ? bond.price : bond.faceValue) * units;
  const submit = () => {
    if (act({ type: 'BOND_ORDER', bondId: bond.id, side, units }, `${side === 'BUY' ? 'Bought' : 'Sold'} ${units} units of ${bond.name}`)) onClose();
  };
  return (
    <Modal open onClose={onClose} title={bond.name}>
      <Pills options={[{ id: 'BUY', label: 'Buy' }, { id: 'SELL', label: 'Sell' }] as const} value={side} onChange={setSide} className="mb-4" />
      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <Stat label="Price / unit" value={formatINR(bond.price)} />
        <Stat label="YTM" value={`${bond.ytm.toFixed(2)}%`} />
        <Stat label={bond.type === 'SGB' ? 'Interest' : 'Coupon'} value={`${bond.couponRate}%`} />
      </div>
      <Field label={bond.type === 'SGB' ? 'Units (1 unit = 1 gram)' : `Units (face value ${formatINR(bond.faceValue, 0)})`} hint={side === 'SELL' ? `You hold ${held} units` : undefined}>
        <NumberInput value={units} onChange={(v) => setUnits(Math.floor(v))} min={1} step={1} />
      </Field>
      <div className="rounded-xl bg-slate-50 p-3 mt-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">{side === 'BUY' ? 'Investment' : 'Sale proceeds'}</span><span className="font-bold tabular-nums">{formatINR(amount)}</span></div>
        {side === 'BUY' && (
          <>
            <div className="flex justify-between"><span className="text-slate-500">Est. coupon income till maturity</span><span className="tabular-nums">{formatINR(couponIncome)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Redemption on {formatDate(bond.maturityDate)}</span><span className="tabular-nums">{formatINR(redemption)}{bond.type === 'SGB' && ' *'}</span></div>
          </>
        )}
      </div>
      {bond.type === 'SGB' && <p className="text-[11px] text-slate-400 mt-2">* SGB redemption is linked to the gold price at maturity.</p>}
      <Button variant={side === 'BUY' ? 'primary' : 'danger'} size="lg" className="w-full mt-4" onClick={submit}>{side === 'BUY' ? 'Buy' : 'Sell'}</Button>
    </Modal>
  );
}

export default function BondsTab() {
  const { state } = useStore();
  const [type, setType] = useState<'All' | BondType>('All');
  const [sort, setSort] = useState<'ytm' | 'maturity' | 'coupon'>('ytm');
  const [ticket, setTicket] = useState<{ bond: Bond; side: TradeSide } | null>(null);
  const list = useMemo(() => {
    const l = state.bonds.filter((b) => (type === 'All' || b.type === type) && b.maturityDate > state.simDate);
    return l.sort((a, b) => (sort === 'ytm' ? b.ytm - a.ytm : sort === 'coupon' ? b.couponRate - a.couponRate : a.maturityDate.localeCompare(b.maturityDate)));
  }, [state.bonds, state.simDate, type, sort]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bonds</h1>
        <p className="text-sm text-slate-500">Government securities, T-Bills, SDLs, Sovereign Gold Bonds, tax-free and corporate bonds. Coupons are credited to your wallet automatically.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4 flex gap-3"><ShieldCheck className="w-8 h-8 text-emerald-600" /><div><div className="font-semibold text-sm">Sovereign safety</div><div className="text-xs text-slate-500">G-Secs, T-Bills and SGBs are backed by the Government of India.</div></div></Card>
        <Card className="p-4 flex gap-3"><Landmark className="w-8 h-8 text-sky-600" /><div><div className="font-semibold text-sm">Fixed income</div><div className="text-xs text-slate-500">Earn predictable coupons; prices move inversely to interest rates.</div></div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Highest YTM available</div><div className="text-2xl font-bold text-emerald-600">{Math.max(...state.bonds.map((b) => b.ytm)).toFixed(2)}%</div></Card>
      </div>
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <Pills options={['All', ...BOND_TYPES] as ('All' | BondType)[]} value={type} onChange={setType} size="sm" />
        <Pills options={[{ id: 'ytm', label: 'Highest yield' }, { id: 'coupon', label: 'Highest coupon' }, { id: 'maturity', label: 'Shortest maturity' }] as const} value={sort} onChange={setSort} size="sm" />
      </Card>
      {list.length === 0 ? <Card><EmptyState title="No bonds in this category" /></Card> : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((b) => {
            const held = state.holdings.find((h) => h.assetType === 'bond' && h.assetId === b.id);
            const chg = ((b.price - b.prevPrice) / b.prevPrice) * 100;
            return (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{b.name}</div>
                    <div className="text-xs text-slate-500">{b.issuer}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge tone="blue">{b.type}</Badge>
                    <Badge tone={b.rating.startsWith('Sovereign') || b.rating === 'AAA' ? 'green' : 'amber'}>{b.rating}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                  <Stat label="YTM" value={<span className="text-emerald-600">{b.ytm.toFixed(2)}%</span>} />
                  <Stat label="Coupon" value={`${b.couponRate}%`} />
                  <Stat label="Price" value={formatNumber(b.price)} sub={<Change pct={chg} showAbs={false} decimals={2} />} />
                  <Stat label="Matures" value={formatDate(b.maturityDate)} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <div className="text-xs text-slate-500">
                    {FREQ[b.couponFrequency]} payout{b.taxFree && <span className="text-emerald-600 font-semibold"> · Tax-free</span>}
                    {held && <span className="text-sky-700 font-semibold"> · You hold {held.quantity}</span>}
                  </div>
                  <div className="flex gap-2">
                    {held && b.type !== 'Floating Rate' && <Button size="sm" variant="outline" onClick={() => setTicket({ bond: b, side: 'SELL' })}>Sell</Button>}
                    <Button size="sm" onClick={() => setTicket({ bond: b, side: 'BUY' })}>Buy</Button>
                  </div>
                </div>
                <p className={cn('text-xs text-slate-500 mt-2 line-clamp-2')}>{b.description}</p>
              </Card>
            );
          })}
        </div>
      )}
      {ticket && <BondTicket key={ticket.bond.id + ticket.side} bond={ticket.bond} side={ticket.side} onClose={() => setTicket(null)} />}
      <Disclaimer />
    </div>
  );
}
