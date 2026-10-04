import { useState } from 'react';
import { Rocket } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { ipoStatus } from '../store/reducer';
import { ipoListingPrice, stockIdForTicker } from '../store/state';
import { Ipo, IpoStatus } from '../types';
import { formatCrore, formatDate, formatINR } from '../lib/format';
import { Badge, Button, Card, Disclaimer, EmptyState, Field, Logo, Modal, NumberInput, Pills, Stat } from './common/ui';

function ApplyModal({ ipo, onClose }: { ipo: Ipo; onClose: () => void }) {
  const { state, act } = useStore();
  const [lots, setLots] = useState(1);
  const maxLots = Math.floor(200000 / (ipo.lotSize * ipo.priceHigh));
  const amount = (Number.isFinite(lots) ? lots : 0) * ipo.lotSize * ipo.priceHigh;
  const submit = () => {
    if (act({ type: 'IPO_APPLY', ipoId: ipo.id, lots }, `Applied for ${lots} lot(s) of ${ipo.company}. ${formatINR(amount, 0)} blocked via UPI mandate.`)) onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Apply · ${ipo.company}`}>
      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <Stat label="Price band" value={`₹${ipo.priceLow}–${ipo.priceHigh}`} />
        <Stat label="Lot size" value={`${ipo.lotSize} shares`} />
        <Stat label="Max lots (retail)" value={maxLots} />
      </div>
      <Field label="Lots (bid at cut-off price)">
        <NumberInput value={lots} onChange={(v) => setLots(Math.floor(v))} min={1} max={maxLots} step={1} />
      </Field>
      <div className="rounded-xl bg-slate-50 p-3 mt-4 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Amount to be blocked</span><span className="font-bold tabular-nums">{formatINR(amount, 0)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Wallet balance</span><span className="tabular-nums">{formatINR(state.balance)}</span></div>
      </div>
      <p className="text-xs text-slate-500 mt-3">Allotment happens the day after the issue closes (lottery for oversubscribed issues, max 1 lot). Unallotted money is released automatically.</p>
      <Button size="lg" className="w-full mt-4" onClick={submit}>Apply</Button>
    </Modal>
  );
}

export default function IpoTab() {
  const { state } = useStore();
  const nav = useNav();
  const [filter, setFilter] = useState<'All' | IpoStatus>('All');
  const [applying, setApplying] = useState<Ipo | null>(null);
  const list = state.ipos.filter((i) => filter === 'All' || ipoStatus(i, state.simDate) === filter);
  const tone = { Upcoming: 'blue', Open: 'green', Closed: 'amber', Listed: 'slate' } as const;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">IPOs</h1>
        <p className="text-sm text-slate-500">Apply to mainboard IPOs, track allotment, and watch listing-day performance. Use “Next day” to move through the IPO calendar.</p>
      </div>
      <Pills options={['All', 'Open', 'Upcoming', 'Closed', 'Listed'] as const} value={filter} onChange={setFilter} />
      {state.ipoApplications.length > 0 && (
        <Card className="p-4">
          <h2 className="font-bold text-slate-800 mb-2">Your applications</h2>
          <div className="divide-y divide-slate-100">
            {state.ipoApplications.map((a) => {
              const ipo = state.ipos.find((i) => i.id === a.ipoId)!;
              return (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div><div className="font-semibold">{ipo.company}</div><div className="text-xs text-slate-500">{a.lots} lot(s) · {formatINR(a.amount, 0)} · applied {formatDate(a.appliedOn)}</div></div>
                  <Badge tone={a.status === 'ALLOTTED' ? 'green' : a.status === 'NOT_ALLOTTED' ? 'red' : 'amber'}>{a.status === 'APPLIED' ? 'Allotment pending' : a.status === 'ALLOTTED' ? 'Allotted' : 'Not allotted'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {list.length === 0 ? <Card><EmptyState icon={<Rocket className="w-5 h-5" />} title={`No ${filter.toLowerCase()} IPOs`} /></Card> : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((ipo) => {
            const status = ipoStatus(ipo, state.simDate);
            const applied = state.ipoApplications.some((a) => a.ipoId === ipo.id);
            const listed = state.stocks.find((s) => s.id === stockIdForTicker(ipo.ticker));
            return (
              <Card key={ipo.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Logo name={ipo.company} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-800">{ipo.company}</div>
                      <Badge tone={tone[status]}>{status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">{ipo.sector} · Issue size {formatCrore(ipo.issueSizeCr)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <Stat label="Price band" value={`₹${ipo.priceLow}–${ipo.priceHigh}`} />
                  <Stat label="Min. investment" value={formatINR(ipo.lotSize * ipo.priceHigh, 0)} />
                  <Stat label={status === 'Upcoming' ? 'Opens' : 'Subscribed'} value={status === 'Upcoming' ? formatDate(ipo.openDate) : `${ipo.subscriptionX.toFixed(1)}x`} />
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)} · Listing {formatDate(ipo.listingDate)}
                  {status === 'Listed' && listed && (
                    <span className={listed.price >= ipo.priceHigh ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}> · Now {formatINR(listed.price)} ({(((listed.price - ipo.priceHigh) / ipo.priceHigh) * 100).toFixed(1)}% vs issue)</span>
                  )}
                  {status === 'Closed' && <span> · Expected listing ~{formatINR(ipoListingPrice(ipo), 0)}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{ipo.description}</p>
                <div className="mt-3 flex justify-end gap-2">
                  {status === 'Listed' && listed && <Button size="sm" variant="outline" onClick={() => nav.openStock(listed.id)}>View stock</Button>}
                  {status === 'Open' && <Button size="sm" disabled={applied} onClick={() => setApplying(ipo)}>{applied ? 'Applied' : 'Apply'}</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {applying && <ApplyModal ipo={applying} onClose={() => setApplying(null)} />}
      <Disclaimer />
    </div>
  );
}
