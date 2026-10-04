import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { portfolioSummary } from '../store/selectors';
import { formatINR } from '../lib/format';
import { Button, Field, Modal, NumberInput, Pills } from './common/ui';

export default function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, act } = useStore();
  const [mode, setMode] = useState<'Add money' | 'Withdraw'>('Add money');
  const [amount, setAmount] = useState(10000);
  const summary = portfolioSummary(state);
  const marginBlocked = state.fnoPositions.reduce((a, p) => a + p.marginBlocked, 0);

  const submit = () => {
    const ok =
      mode === 'Add money'
        ? act({ type: 'DEPOSIT', amount }, `${formatINR(amount)} added to your wallet.`)
        : act({ type: 'WITHDRAW', amount }, `${formatINR(amount)} withdrawn to your bank.`);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Wallet">
      <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-4 mb-4">
        <div className="text-xs opacity-80">Available balance</div>
        <div className="text-2xl font-bold tabular-nums">{formatINR(state.balance)}</div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div>
            <div className="opacity-80">Blocked (orders/IPO)</div>
            <div className="font-semibold tabular-nums">{formatINR(summary.blockedCash)}</div>
          </div>
          <div>
            <div className="opacity-80">F&O margin used</div>
            <div className="font-semibold tabular-nums">{formatINR(marginBlocked)}</div>
          </div>
        </div>
      </div>
      <Pills options={['Add money', 'Withdraw'] as const} value={mode} onChange={setMode} className="mb-4" />
      <Field label="Amount">
        <NumberInput value={amount} onChange={setAmount} prefix="₹" min={1} />
      </Field>
      <div className="flex gap-2 mt-3">
        {[1000, 5000, 25000, 100000].map((v) => (
          <button key={v} onClick={() => setAmount(v)} className="text-xs font-semibold rounded-lg border border-slate-200 px-2 py-1 hover:border-emerald-400">
            +{formatINR(v, 0)}
          </button>
        ))}
      </div>
      <Button className="w-full mt-5" size="lg" variant={mode === 'Withdraw' ? 'outline' : 'primary'} onClick={submit}>
        {mode === 'Add money' ? 'Add via UPI (simulated)' : 'Withdraw to bank'}
      </Button>
    </Modal>
  );
}
