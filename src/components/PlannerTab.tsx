import { useState } from 'react';
import { Compass, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { useNav } from '../nav';
import { Goal, MutualFund } from '../types';
import { inflate, lumpsumFutureValue, requiredMonthlySip } from '../lib/finance';
import { formatCompactINR, formatINR, parseDate } from '../lib/format';
import { Badge, Button, Card, Disclaimer, EmptyState, Field, inputClass, Modal, NumberInput, Pills, Stat } from './common/ui';
import DecisionWizard from './DecisionWizard';

const CATEGORIES: Goal['category'][] = ['Retirement', 'House', 'Education', 'Car', 'Travel', 'Wedding', 'Emergency', 'Other'];

export function goalPlan(goal: Goal, simDate: string) {
  const years = Math.max(1, goal.targetYear - parseDate(simDate).getFullYear());
  const futureCost = inflate(goal.targetAmount, goal.inflation, years);
  const savedFuture = lumpsumFutureValue(goal.currentSaved, goal.expectedReturn, years);
  const gap = Math.max(0, futureCost - savedFuture);
  const monthlySip = requiredMonthlySip(gap, goal.expectedReturn, years);
  const progress = Math.min(100, (savedFuture / futureCost) * 100);
  return { years, futureCost, savedFuture, gap, monthlySip, progress };
}

function suggestedMix(years: number) {
  if (years <= 3) return { equity: 10, debt: 85, gold: 5, label: 'Short term — protect capital', cats: ['Liquid', 'Short Duration', 'Arbitrage'] };
  if (years <= 7) return { equity: 50, debt: 40, gold: 10, label: 'Medium term — balanced growth', cats: ['Balanced Advantage', 'Aggressive Hybrid', 'Large Cap'] };
  return { equity: 75, debt: 15, gold: 10, label: 'Long term — equity-led compounding', cats: ['Flexi Cap', 'Large & Mid Cap', 'Mid Cap'] };
}

function GoalModal({ initial, onClose }: { initial: Goal; onClose: () => void }) {
  const { act } = useStore();
  const [g, setG] = useState<Goal>(initial);
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setG((x) => ({ ...x, [k]: v }));
  const save = () => {
    if (act({ type: 'GOAL_SAVE', goal: g }, initial.id ? 'Goal updated' : 'Goal created')) onClose();
  };
  return (
    <Modal open onClose={onClose} title={initial.id ? 'Edit goal' : 'New goal'}>
      <div className="space-y-3">
        <Field label="Goal name"><input className={inputClass} value={g.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dream home down payment" /></Field>
        <Field label="Category"><select className={inputClass} value={g.category} onChange={(e) => set('category', e.target.value as Goal['category'])}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cost in today's ₹"><NumberInput value={g.targetAmount} onChange={(v) => set('targetAmount', v)} prefix="₹" /></Field>
          <Field label="Target year"><NumberInput value={g.targetYear} onChange={(v) => set('targetYear', Math.floor(v))} /></Field>
          <Field label="Already saved"><NumberInput value={g.currentSaved} onChange={(v) => set('currentSaved', v)} prefix="₹" /></Field>
          <Field label="Expected return"><NumberInput value={g.expectedReturn} onChange={(v) => set('expectedReturn', v)} suffix="% p.a." step={0.5} /></Field>
          <Field label="Inflation"><NumberInput value={g.inflation} onChange={(v) => set('inflation', v)} suffix="% p.a." step={0.5} /></Field>
        </div>
      </div>
      <Button size="lg" className="w-full mt-5" onClick={save}>Save goal</Button>
    </Modal>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { state, act } = useStore();
  const nav = useNav();
  const p = goalPlan(goal, state.simDate);
  const mix = suggestedMix(p.years);
  const picks = mix.cats
    .map((c) => state.funds.filter((f) => f.subCategory === c).sort((a, b) => b.cagr3y - a.cagr3y)[0])
    .filter((f): f is MutualFund => Boolean(f));
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2"><Target className="w-5 h-5 text-emerald-600" /><h3 className="font-bold text-slate-800">{goal.name}</h3></div>
          <div className="flex gap-1.5 mt-1"><Badge>{goal.category}</Badge><Badge tone="blue">{goal.targetYear} · {p.years} yrs</Badge></div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit goal"><Pencil className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" aria-label="Delete goal" onClick={() => window.confirm(`Delete goal “${goal.name}”?`) && act({ type: 'GOAL_DELETE', goalId: goal.id }, 'Goal deleted')}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
        <Stat label="Today's cost" value={formatCompactINR(goal.targetAmount)} />
        <Stat label={`Cost in ${goal.targetYear}`} value={formatCompactINR(p.futureCost)} />
        <Stat label="Savings will grow to" value={formatCompactINR(p.savedFuture)} />
        <Stat label="Monthly SIP needed" value={<span className="text-emerald-600">{formatINR(p.monthlySip, 0)}</span>} />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Funded by current savings</span><span>{p.progress.toFixed(0)}%</span></div>
        <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress}%` }} /></div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-600">{mix.label}: {mix.equity}% equity · {mix.debt}% debt · {mix.gold}% gold</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {picks.map((f) => (
            <button key={f.id} onClick={() => nav.openFund(f.id)} className="text-xs rounded-lg bg-white border border-slate-200 hover:border-emerald-400 px-2 py-1 text-left">
              <span className="font-semibold">{f.name}</span> <span className="text-emerald-600">{f.cagr3y}% 3Y</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function PlannerTab() {
  const { state, act } = useStore();
  const nav = useNav();
  const [view, setView] = useState<'Goals' | 'Risk profile'>('Goals');
  const [editing, setEditing] = useState<Goal | null>(null);
  const year = parseDate(state.simDate).getFullYear();
  const totalSip = state.goals.reduce((a, g) => a + goalPlan(g, state.simDate).monthlySip, 0);
  const newGoal = (): Goal => ({ id: '', name: '', category: 'House', targetAmount: 2500000, targetYear: year + 7, currentSaved: 0, expectedReturn: 12, inflation: 6, createdAt: state.simDate });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Goals & Planner</h1>
          <p className="text-sm text-slate-500">Turn life goals into inflation-adjusted SIP plans, and discover your risk profile.</p>
        </div>
        <Pills options={['Goals', 'Risk profile'] as const} value={view} onChange={setView} />
      </div>
      {view === 'Goals' ? (
        <>
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-6 text-sm">
              <Stat label="Goals" value={state.goals.length} />
              <Stat label="Total monthly SIP needed" value={formatINR(totalSip, 0)} />
              <Stat label="Your risk profile" value={state.userProfile.isCompleted ? state.userProfile.riskTolerance : 'Not assessed'} />
            </div>
            <Button onClick={() => setEditing(newGoal())}><Plus className="w-4 h-4 inline mr-1" />Add goal</Button>
          </Card>
          {state.goals.length === 0 ? (
            <Card><EmptyState icon={<Target className="w-5 h-5" />} title="No goals yet" text="Add a goal like a house, education or retirement to get a SIP plan." /></Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">{state.goals.map((g) => <GoalCard key={g.id} goal={g} onEdit={() => setEditing(g)} />)}</div>
          )}
          {!state.userProfile.isCompleted && (
            <Card className="p-4 flex items-center gap-3 bg-sky-50 border-sky-100">
              <Compass className="w-6 h-6 text-sky-600" />
              <div className="flex-1 text-sm text-slate-700">Complete your risk profile to get a personalised asset allocation.</div>
              <Button size="sm" onClick={() => setView('Risk profile')}>Start</Button>
            </Card>
          )}
        </>
      ) : (
        <DecisionWizard
          onCompleteProfile={(profile) => act({ type: 'SET_PROFILE', profile }, 'Risk profile saved')}
          onExploreStock={(s) => nav.openStock(s.id)}
          onExploreFund={(f) => nav.openFund(f.id)}
        />
      )}
      {editing && <GoalModal initial={editing} onClose={() => setEditing(null)} />}
      <Disclaimer />
    </div>
  );
}
