import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartRange, CHART_RANGES, generateSeries, seriesReturnPct } from '../../lib/history';
import { formatINR, formatNumber } from '../../lib/format';
import { Change, Pills } from './ui';

export default function PriceChart({
  seedKey,
  endValue,
  openValue,
  drift,
  vol,
  endDate,
  height = 260,
  defaultRange = '1Y',
  ranges = CHART_RANGES,
}: {
  seedKey: string;
  endValue: number;
  openValue?: number;
  drift: number;
  vol: number;
  endDate: string;
  height?: number;
  defaultRange?: ChartRange;
  ranges?: ChartRange[];
}) {
  const [range, setRange] = useState<ChartRange>(defaultRange);
  const series = useMemo(
    () => generateSeries(seedKey, endValue, range, drift, vol, endDate, openValue),
    [seedKey, endValue, range, drift, vol, endDate, openValue],
  );
  const ret = seriesReturnPct(series);
  const up = ret >= 0;
  const color = up ? '#10b981' : '#f43f5e';
  const gid = `g-${seedKey.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">
          {range} return <Change pct={ret} showAbs={false} />
        </span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={40} tickLine={false} axisLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v, v < 100 ? 2 : 0)} />
            <Tooltip formatter={(v) => [formatINR(Number(v)), 'Price']} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Pills options={ranges} value={range} onChange={setRange} size="sm" className="mt-3 justify-center" />
    </div>
  );
}
