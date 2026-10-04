import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cagr, emi, fdMaturity, inflate, lumpsumFutureValue, ppfMaturity, rdMaturity, retirementCorpus, requiredMonthlySip, sipFutureValue, stepUpSipFutureValue, swpSchedule } from '../lib/finance';
import { formatCompactINR, formatINR, formatPct } from '../lib/format';
import { Card, cn, Disclaimer, Slider, Stat } from './common/ui';

const axisINR = (v: number) => (v >= 1e7 ? `₹${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `₹${+(v / 1e3).toFixed(0)}K` : `₹${v}`);

type CalcId = 'sip' | 'stepup' | 'lumpsum' | 'swp' | 'fd' | 'rd' | 'ppf' | 'emi' | 'retirement' | 'cagr' | 'goal';
const CALCS: { id: CalcId; label: string; desc: string }[] = [
  { id: 'sip', label: 'SIP', desc: 'Monthly investment growth' },
  { id: 'stepup', label: 'Step-up SIP', desc: 'SIP increasing every year' },
  { id: 'lumpsum', label: 'Lumpsum', desc: 'One-time investment' },
  { id: 'swp', label: 'SWP', desc: 'Systematic withdrawals' },
  { id: 'goal', label: 'Goal SIP', desc: 'SIP needed for a target' },
  { id: 'fd', label: 'FD', desc: 'Fixed deposit maturity' },
  { id: 'rd', label: 'RD', desc: 'Recurring deposit' },
  { id: 'ppf', label: 'PPF', desc: 'Public Provident Fund' },
  { id: 'emi', label: 'EMI', desc: 'Loan instalments' },
  { id: 'retirement', label: 'Retirement', desc: 'Corpus you will need' },
  { id: 'cagr', label: 'CAGR', desc: 'Annualised growth rate' },
];

const tip = { formatter: (v: unknown) => formatINR(Number(v), 0), contentStyle: { borderRadius: 12, fontSize: 12 } };

function Result({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
      {items.map((i) => <Stat key={i.label} label={i.label} value={<span className={i.tone}>{i.value}</span>} />)}
    </div>
  );
}

function GrowthChart({ data }: { data: { year: number; invested: number; value: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={(y) => `Y${y}`} />
          <YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={axisINR} />
          <Tooltip {...tip} labelFormatter={(y) => `Year ${y}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="invested" name="Invested" stroke="#94a3b8" fill="#e2e8f0" isAnimationActive={false} />
          <Area type="monotone" dataKey="value" name="Value" stroke="#10b981" fill="#d1fae5" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SipCalc({ stepUp }: { stepUp?: boolean }) {
  const [m, setM] = useState(10000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(15);
  const [s, setS] = useState(10);
  const data = useMemo(() => Array.from({ length: y }, (_, i) => {
    if (stepUp) { const x = stepUpSipFutureValue(m, r, i + 1, s); return { year: i + 1, invested: Math.round(x.invested), value: Math.round(x.value) }; }
    return { year: i + 1, invested: m * 12 * (i + 1), value: Math.round(sipFutureValue(m, r, i + 1)) };
  }), [m, r, y, s, stepUp]);
  const last = data[data.length - 1];
  return (
    <>
      <div className="space-y-4">
        <Slider label="Monthly investment (₹)" value={m} onChange={setM} min={500} max={200000} step={500} />
        {stepUp && <Slider label="Annual step-up (%)" value={s} onChange={setS} min={0} max={30} />}
        <Slider label="Expected return (% p.a.)" value={r} onChange={setR} min={1} max={30} step={0.5} />
        <Slider label="Time period (years)" value={y} onChange={setY} min={1} max={40} />
      </div>
      <Result items={[{ label: 'Invested', value: formatINR(last.invested, 0) }, { label: 'Est. returns', value: formatINR(last.value - last.invested, 0), tone: 'text-emerald-600' }, { label: 'Total value', value: formatINR(last.value, 0) }]} />
      <GrowthChart data={data} />
    </>
  );
}

function LumpsumCalc() {
  const [p, setP] = useState(100000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(10);
  const data = Array.from({ length: y }, (_, i) => ({ year: i + 1, invested: p, value: Math.round(lumpsumFutureValue(p, r, i + 1)) }));
  const v = data[data.length - 1].value;
  return (
    <>
      <div className="space-y-4">
        <Slider label="Total investment (₹)" value={p} onChange={setP} min={1000} max={10000000} step={1000} />
        <Slider label="Expected return (% p.a.)" value={r} onChange={setR} min={1} max={30} step={0.5} />
        <Slider label="Time period (years)" value={y} onChange={setY} min={1} max={40} />
      </div>
      <Result items={[{ label: 'Invested', value: formatINR(p, 0) }, { label: 'Est. returns', value: formatINR(v - p, 0), tone: 'text-emerald-600' }, { label: 'Total value', value: formatINR(v, 0) }]} />
      <GrowthChart data={data} />
    </>
  );
}

function SwpCalc() {
  const [c, setC] = useState(5000000);
  const [w, setW] = useState(30000);
  const [r, setR] = useState(8);
  const [y, setY] = useState(20);
  const sched = swpSchedule(c, w, r, y);
  const last = sched[sched.length - 1];
  const totalW = last.withdrawn;
  const depleted = sched.find((x) => x.balance <= 0);
  return (
    <>
      <div className="space-y-4">
        <Slider label="Total investment (₹)" value={c} onChange={setC} min={100000} max={50000000} step={50000} />
        <Slider label="Monthly withdrawal (₹)" value={w} onChange={setW} min={1000} max={500000} step={1000} />
        <Slider label="Expected return (% p.a.)" value={r} onChange={setR} min={1} max={20} step={0.5} />
        <Slider label="Time period (years)" value={y} onChange={setY} min={1} max={40} />
      </div>
      <Result items={[{ label: 'Total withdrawn', value: formatINR(totalW, 0) }, { label: 'Final value', value: formatINR(Math.max(0, last.balance), 0), tone: last.balance > 0 ? 'text-emerald-600' : 'text-rose-600' }, { label: 'Corpus lasts', value: depleted ? `${depleted.year} yrs` : `${y}+ yrs` }]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sched}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="year" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={axisINR} /><Tooltip {...tip} /><Bar dataKey="balance" name="Balance" fill="#10b981" isAnimationActive={false} /></BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function GoalCalc() {
  const [t, setT] = useState(5000000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(10);
  const [inf, setInf] = useState(6);
  const future = inflate(t, inf, y);
  const sip = requiredMonthlySip(future, r, y);
  return (
    <>
      <div className="space-y-4">
        <Slider label="Goal amount in today's ₹" value={t} onChange={setT} min={50000} max={100000000} step={50000} />
        <Slider label="Years to goal" value={y} onChange={setY} min={1} max={40} />
        <Slider label="Expected return (% p.a.)" value={r} onChange={setR} min={1} max={25} step={0.5} />
        <Slider label="Inflation (% p.a.)" value={inf} onChange={setInf} min={0} max={12} step={0.5} />
      </div>
      <Result items={[{ label: 'Future cost', value: formatINR(future, 0) }, { label: 'Monthly SIP needed', value: formatINR(sip, 0), tone: 'text-emerald-600' }, { label: 'Total invested', value: formatINR(sip * 12 * y, 0) }]} />
    </>
  );
}

function DepositCalc({ kind }: { kind: 'fd' | 'rd' | 'ppf' }) {
  const [p, setP] = useState(kind === 'fd' ? 100000 : kind === 'rd' ? 5000 : 150000);
  const [r, setR] = useState(kind === 'ppf' ? 7.1 : kind === 'fd' ? 7 : 6.8);
  const [y, setY] = useState(kind === 'ppf' ? 15 : 5);
  const value = kind === 'fd' ? fdMaturity(p, r, y) : kind === 'rd' ? rdMaturity(p, r, y) : ppfMaturity(p, r, y);
  const invested = kind === 'fd' ? p : kind === 'rd' ? p * 12 * y : p * y;
  return (
    <>
      <div className="space-y-4">
        <Slider label={kind === 'fd' ? 'Deposit amount (₹)' : kind === 'rd' ? 'Monthly deposit (₹)' : 'Yearly investment (₹, max 1.5L)'} value={p} onChange={setP} min={kind === 'ppf' ? 500 : 500} max={kind === 'ppf' ? 150000 : kind === 'rd' ? 200000 : 10000000} step={500} />
        <Slider label="Interest rate (% p.a.)" value={r} onChange={setR} min={1} max={15} step={0.1} />
        <Slider label="Time period (years)" value={y} onChange={setY} min={kind === 'ppf' ? 15 : 1} max={kind === 'ppf' ? 50 : 25} />
      </div>
      <Result items={[{ label: 'Invested', value: formatINR(invested, 0) }, { label: 'Interest earned', value: formatINR(value - invested, 0), tone: 'text-emerald-600' }, { label: 'Maturity value', value: formatINR(value, 0) }]} />
      {kind === 'fd' && <p className="text-xs text-slate-500">Compounded quarterly, as most Indian banks do.</p>}
      {kind === 'ppf' && <p className="text-xs text-slate-500">PPF has a 15-year lock-in (extendable in 5-year blocks). Contributions qualify for Section 80C and interest is tax-free (EEE).</p>}
    </>
  );
}

function EmiCalc() {
  const [p, setP] = useState(5000000);
  const [r, setR] = useState(8.5);
  const [y, setY] = useState(20);
  const e = emi(p, r, y);
  const total = e * y * 12;
  const data = useMemo(() => {
    let bal = p;
    const rate = r / 12 / 100;
    return Array.from({ length: y }, (_, i) => {
      let interest = 0;
      let principal = 0;
      for (let m = 0; m < 12; m++) { const int = bal * rate; interest += int; principal += e - int; bal -= e - int; }
      return { year: i + 1, principal: Math.round(principal), interest: Math.round(interest) };
    });
  }, [p, r, y, e]);
  return (
    <>
      <div className="space-y-4">
        <Slider label="Loan amount (₹)" value={p} onChange={setP} min={10000} max={50000000} step={10000} />
        <Slider label="Interest rate (% p.a.)" value={r} onChange={setR} min={1} max={24} step={0.05} />
        <Slider label="Tenure (years)" value={y} onChange={setY} min={1} max={30} />
      </div>
      <Result items={[{ label: 'Monthly EMI', value: formatINR(e, 0), tone: 'text-emerald-600' }, { label: 'Total interest', value: formatINR(total - p, 0), tone: 'text-rose-600' }, { label: 'Total payment', value: formatINR(total, 0) }]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="year" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={60} tickFormatter={axisINR} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="principal" name="Principal" stackId="a" fill="#10b981" isAnimationActive={false} /><Bar dataKey="interest" name="Interest" stackId="a" fill="#f43f5e" isAnimationActive={false} /></BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function RetirementCalc() {
  const [age, setAge] = useState(30);
  const [ret, setRet] = useState(60);
  const [life, setLife] = useState(85);
  const [exp, setExp] = useState(50000);
  const [inf, setInf] = useState(6);
  const [pre, setPre] = useState(12);
  const [post, setPost] = useState(7);
  const corpus = retirementCorpus(exp, age, ret, life, inf, post);
  const years = Math.max(1, ret - age);
  const sip = requiredMonthlySip(corpus, pre, years);
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <Slider label="Current age" value={age} onChange={setAge} min={18} max={60} />
        <Slider label="Retirement age" value={ret} onChange={(v) => setRet(Math.max(v, age + 1))} min={40} max={75} />
        <Slider label="Life expectancy" value={life} onChange={(v) => setLife(Math.max(v, ret + 1))} min={60} max={100} />
        <Slider label="Monthly expenses today (₹)" value={exp} onChange={setExp} min={5000} max={500000} step={1000} />
        <Slider label="Inflation (%)" value={inf} onChange={setInf} min={0} max={12} step={0.5} />
        <Slider label="Pre-retirement return (%)" value={pre} onChange={setPre} min={1} max={20} step={0.5} />
        <Slider label="Post-retirement return (%)" value={post} onChange={setPost} min={1} max={15} step={0.5} />
      </div>
      <Result items={[{ label: 'Expense at retirement', value: `${formatINR(inflate(exp, inf, years), 0)}/mo` }, { label: 'Corpus required', value: formatCompactINR(corpus), tone: 'text-emerald-600' }, { label: 'Monthly SIP needed', value: formatINR(sip, 0) }]} />
    </>
  );
}

function CagrCalc() {
  const [a, setA] = useState(100000);
  const [b, setB] = useState(250000);
  const [y, setY] = useState(5);
  const g = cagr(a, b, y);
  return (
    <>
      <div className="space-y-4">
        <Slider label="Initial value (₹)" value={a} onChange={setA} min={1000} max={10000000} step={1000} />
        <Slider label="Final value (₹)" value={b} onChange={setB} min={1000} max={50000000} step={1000} />
        <Slider label="Duration (years)" value={y} onChange={setY} min={1} max={40} />
      </div>
      <Result items={[{ label: 'CAGR', value: formatPct(g, 2, false), tone: g >= 0 ? 'text-emerald-600' : 'text-rose-600' }, { label: 'Absolute return', value: formatPct(((b - a) / a) * 100, 1, false) }, { label: 'Gain', value: formatINR(b - a, 0) }]} />
    </>
  );
}

export default function CalculatorsTab() {
  const [calc, setCalc] = useState<CalcId>('sip');
  const current = CALCS.find((c) => c.id === calc)!;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Calculators</h1>
        <p className="text-sm text-slate-500">Plan investments, deposits, loans and retirement with {CALCS.length} financial calculators.</p>
      </div>
      <div className="grid lg:grid-cols-[240px_1fr] gap-4">
        <Card className="p-2 h-fit">
          <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {CALCS.map((c) => (
              <button key={c.id} onClick={() => setCalc(c.id)} className={cn('text-left rounded-xl px-3 py-2 whitespace-nowrap', calc === c.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600')}>
                <div className="text-sm font-semibold">{c.label} calculator</div>
                <div className="hidden lg:block text-[11px] text-slate-400">{c.desc}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5 space-y-5">
          <h2 className="font-bold text-slate-800 text-lg">{current.label} calculator</h2>
          {calc === 'sip' && <SipCalc key="sip" />}
          {calc === 'stepup' && <SipCalc key="stepup" stepUp />}
          {calc === 'lumpsum' && <LumpsumCalc />}
          {calc === 'swp' && <SwpCalc />}
          {calc === 'goal' && <GoalCalc />}
          {(calc === 'fd' || calc === 'rd' || calc === 'ppf') && <DepositCalc key={calc} kind={calc} />}
          {calc === 'emi' && <EmiCalc />}
          {calc === 'retirement' && <RetirementCalc />}
          {calc === 'cagr' && <CagrCalc />}
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}
