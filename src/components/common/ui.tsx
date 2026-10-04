import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, Star, X } from 'lucide-react';
import { formatNumber, formatPct } from '../../lib/format';
import { useStore } from '../../store/StoreContext';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200/80 shadow-sm', className)} {...rest}>
      {children}
    </div>
  );
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  red: 'bg-rose-50 text-rose-700 border-rose-100',
  blue: 'bg-sky-50 text-sky-700 border-sky-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function riskTone(risk: string): Tone {
  if (risk === 'Low' || risk === 'Low to Moderate') return 'green';
  if (risk === 'Moderate' || risk === 'Medium' || risk === 'Moderately High') return 'amber';
  return 'red';
}

export function Change({ value, pct, className, showAbs = true, decimals = 2 }: { value?: number; pct: number; className?: string; showAbs?: boolean; decimals?: number }) {
  const up = pct >= 0;
  return (
    <span className={cn('font-semibold tabular-nums', up ? 'text-emerald-600' : 'text-rose-600', className)}>
      {showAbs && value !== undefined && `${up ? '+' : ''}${formatNumber(value, decimals)} `}
      {showAbs && value !== undefined ? `(${formatPct(pct)})` : formatPct(pct)}
    </span>
  );
}

export function Sparkline({ data, width = 80, height = 28, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / span) * (height - 4) - 2}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? '#10b981' : '#f43f5e'} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn('bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto', wide ? 'sm:max-w-3xl' : 'sm:max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Pills<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: readonly (NoInfer<T> | { id: NoInfer<T>; label: React.ReactNode })[];
  value: T;
  onChange: (v: NoInfer<T>) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto no-scrollbar', className)}>
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'rounded-full border font-semibold whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              value === id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-bold text-slate-800 tabular-nums">{value}</div>
      {sub && <div className="text-xs">{sub}</div>}
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} star rating`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('w-3.5 h-3.5', i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      {icon && <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">{icon}</div>}
      <div className="font-semibold text-slate-700">{title}</div>
      {text && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg' }) {
  const v = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    ghost: 'hover:bg-slate-100 text-slate-600',
    outline: 'border border-slate-200 hover:border-emerald-400 text-slate-700 bg-white',
  }[variant];
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }[size];
  return (
    <button className={cn('rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed', v, s, className)} {...rest}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 tabular-nums';

export function NumberInput({ value, onChange, min, max, step, prefix, suffix, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
      <input
        type="number"
        className={cn(inputClass, prefix && 'pl-7', suffix && 'pr-12')}
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        {...rest}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-600">{label}</span>
        <input
          type="number"
          aria-label={label}
          className="w-32 text-right rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm px-2 py-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
        />
      </div>
      <input type="range" className="w-full accent-emerald-600" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {format && <div className="text-[11px] text-slate-400 text-right">{format(value)}</div>}
    </div>
  );
}

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium',
            t.kind === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
            t.kind === 'error' && 'bg-rose-50 border-rose-200 text-rose-800',
            t.kind === 'info' && 'bg-sky-50 border-sky-200 text-sky-800',
          )}
        >
          {t.kind === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : t.kind === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span className="text-slate-500 tabular-nums">
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-slate-800">{children}</h2>
      {action}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] text-slate-400 leading-relaxed', className)}>
      Simulated, illustrative market data for education only — not live prices and not investment advice. Investments in securities markets are subject to market risks.
    </p>
  );
}

export function Logo({ name }: { name: string }) {
  const palette = ['bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];
  const idx = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const initials = name.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0', palette[idx])}>{initials}</div>;
}
