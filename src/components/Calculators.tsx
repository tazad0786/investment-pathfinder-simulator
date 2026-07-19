import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { HelpCircle, Percent, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { mockMutualFunds } from '../data/mockData';
import { MutualFund } from '../types';

export default function Calculators({ onExploreFund }: { onExploreFund: (fund: MutualFund) => void }) {
  const [calcMode, setCalcMode] = useState<'sip' | 'lumpsum'>('sip');
  
  // SIP defaults
  const [monthlySip, setMonthlySip] = useState<number>(5000);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(10);

  // Lumpsum defaults
  const [lumpsumAmount, setLumpsumAmount] = useState<number>(50000);
  const [lumpsumRate, setLumpsumRate] = useState<number>(12);
  const [lumpsumYears, setLumpsumYears] = useState<number>(10);

  // Constants
  const COLORS = ['#CBD5E1', '#10B981']; // Gray for invested, Emerald for returns

  // Calculate compound returns
  const results = useMemo(() => {
    let invested = 0;
    let totalValue = 0;
    const historyData: { year: string; invested: number; value: number }[] = [];

    if (calcMode === 'sip') {
      const P = monthlySip;
      const r = (sipRate / 100) / 12; // monthly interest rate
      
      for (let y = 1; y <= sipYears; y++) {
        const n = y * 12; // number of months
        // Future Value of an Ordinary Annuity: P * [((1 + r)^n - 1) / r] * (1 + r)
        // This formula is standard: P * [((1 + r)^n - 1) / r] * (1 + r)
        const val = P * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const inv = P * n;
        
        historyData.push({
          year: `Yr ${y}`,
          invested: Math.round(inv),
          value: Math.round(val),
        });
      }

      invested = P * 12 * sipYears;
      totalValue = historyData[historyData.length - 1]?.value || 0;
    } else {
      const P = lumpsumAmount;
      const r = lumpsumRate / 100;
      
      for (let y = 1; y <= lumpsumYears; y++) {
        // Compound Interest formula: A = P * (1 + r)^y
        const val = P * Math.pow(1 + r, y);
        historyData.push({
          year: `Yr ${y}`,
          invested: Math.round(P),
          value: Math.round(val),
        });
      }

      invested = P;
      totalValue = historyData[historyData.length - 1]?.value || 0;
    }

    const estReturns = Math.max(0, totalValue - invested);
    
    return {
      invested: Math.round(invested),
      estReturns: Math.round(estReturns),
      totalValue: Math.round(totalValue),
      chartData: historyData,
      pieData: [
        { name: 'Invested', value: Math.round(invested) },
        { name: 'Est. Returns', value: Math.round(estReturns) },
      ]
    };
  }, [calcMode, monthlySip, sipRate, sipYears, lumpsumAmount, lumpsumRate, lumpsumYears]);

  // Dynamic advice / mutual fund matchmaker based on interest input
  const recommendedFunds = useMemo(() => {
    const rate = calcMode === 'sip' ? sipRate : lumpsumRate;
    let matched: MutualFund[] = [];
    if (rate <= 8) {
      // Conservative debt
      matched = mockMutualFunds.filter(f => f.category === 'Debt');
    } else if (rate <= 15) {
      // Index & Hybrid & Flexicap
      matched = mockMutualFunds.filter(f => f.category === 'Index' || f.category === 'Hybrid' || f.subCategory === 'Flexi Cap');
    } else {
      // Small Cap high growth
      matched = mockMutualFunds.filter(f => f.subCategory === 'Small Cap' || f.category === 'Equity');
    }
    return matched.slice(0, 2);
  }, [calcMode, sipRate, lumpsumRate]);

  return (
    <div className="space-y-8 py-2" id="calc-container">
      {/* Selector and Intro */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans font-bold text-2xl tracking-tight text-slate-900">
            Compound Interest Calculator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            See the raw power of financial compounding and visualize how small, regular contributions build massive long-term wealth.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-lg p-1.5 mt-4 md:mt-0" id="calc-mode-selector">
          <button
            onClick={() => setCalcMode('sip')}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-md transition-all ${
              calcMode === 'sip' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Systematic SIP
          </button>
          <button
            onClick={() => setCalcMode('lumpsum')}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-md transition-all ${
              calcMode === 'lumpsum' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lumpsum Investment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="calc-core">
        {/* Sliders Area (Column left) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6" id="calc-sliders-card">
          {calcMode === 'sip' ? (
            <>
              {/* Slider 1: Monthly Investment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Monthly Investment
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      value={monthlySip}
                      onChange={(e) => setMonthlySip(Math.max(500, +e.target.value))}
                      className="w-32 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-3 pl-6 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>₹500</span>
                  <span>₹1,00,000</span>
                </div>
              </div>

              {/* Slider 2: Rate of return */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Expected Return Rate (CAGR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={sipRate}
                      onChange={(e) => setSipRate(Math.max(1, Math.min(30, +e.target.value)))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-6 pl-3 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1.5 text-slate-400 text-sm font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={sipRate}
                  onChange={(e) => setSipRate(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>1%</span>
                  <span>30%</span>
                </div>
              </div>

              {/* Slider 3: Years */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Time Period
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sipYears}
                      onChange={(e) => setSipYears(Math.max(1, Math.min(40, +e.target.value)))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-10 pl-3 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1.5 text-slate-400 text-sm font-medium">Yrs</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={sipYears}
                  onChange={(e) => setSipYears(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>1 Yr</span>
                  <span>40 Yrs</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Slider 1: Lumpsum Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Investment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-slate-400 text-sm font-semibold">₹</span>
                    <input
                      type="number"
                      value={lumpsumAmount}
                      onChange={(e) => setLumpsumAmount(Math.max(5000, +e.target.value))}
                      className="w-36 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-3 pl-6 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="1000000"
                  step="5000"
                  value={lumpsumAmount}
                  onChange={(e) => setLumpsumAmount(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>₹5,000</span>
                  <span>₹10,00,000</span>
                </div>
              </div>

              {/* Slider 2: Rate of return */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Expected Return Rate (CAGR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={lumpsumRate}
                      onChange={(e) => setLumpsumRate(Math.max(1, Math.min(30, +e.target.value)))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-6 pl-3 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1.5 text-slate-400 text-sm font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={lumpsumRate}
                  onChange={(e) => setLumpsumRate(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>1%</span>
                  <span>30%</span>
                </div>
              </div>

              {/* Slider 3: Years */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Time Period
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={lumpsumYears}
                      onChange={(e) => setLumpsumYears(Math.max(1, Math.min(40, +e.target.value)))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-md py-1.5 pr-10 pl-3 text-right text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <span className="absolute right-3 top-1.5 text-slate-400 text-sm font-medium">Yrs</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={lumpsumYears}
                  onChange={(e) => setLumpsumYears(+e.target.value)}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>1 Yr</span>
                  <span>40 Yrs</span>
                </div>
              </div>
            </>
          )}

          {/* Core numerical output summaries */}
          <div className="border-t border-slate-100 pt-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Invested Amount</span>
              <span className="font-sans font-bold text-slate-800 text-sm">
                ₹{results.invested.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Estimated Returns</span>
              <span className="font-sans font-bold text-emerald-600 text-sm">
                + ₹{results.estReturns.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-slate-150 pt-3">
              <span className="text-sm font-bold text-slate-700">Total Value</span>
              <span className="font-sans font-bold text-emerald-500 text-lg">
                ₹{results.totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Graphs Area (Column right) */}
        <div className="lg:col-span-7 flex flex-col space-y-6" id="calc-charts-container">
          {/* Main area plot */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1">
            <h3 className="font-sans font-bold text-xs text-slate-500 uppercase tracking-widest mb-4">
              Compound Projections over Time
            </h3>
            <div className="h-64" id="projection-area-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={results.chartData}
                  margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
                >
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val) => [`₹${(+val).toLocaleString('en-IN')}`]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #F1F5F9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                  />
                  <Area
                    type="monotone"
                    name="Invested"
                    dataKey="invested"
                    stackId="1"
                    stroke="#CBD5E1"
                    fill="#E2E8F0"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    name="Total Value"
                    dataKey="value"
                    stackId="2"
                    stroke="#10B981"
                    fill="#34D399"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend visual bars */}
            <div className="flex justify-center items-center space-x-6 mt-4 pt-4 border-t border-slate-50 text-[11px] font-bold">
              <div className="flex items-center space-x-1.5">
                <span className="block h-3 w-3 rounded-md bg-slate-300"></span>
                <span className="text-slate-500">Invested: ₹{results.invested.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="block h-3 w-3 rounded-md bg-emerald-500"></span>
                <span className="text-slate-600">Total Value: ₹{results.totalValue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Education Box */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-5">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl" id="calc-advice-icon">
              <Percent className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h4 className="font-sans font-bold text-sm text-slate-800">
                WealthWise Wisdom: What is Rupee Cost Averaging?
              </h4>
              <p className="text-xs leading-relaxed text-slate-500">
                By investing via a regular monthly <strong>SIP</strong> (instead of a single bulk lumpsum), you buy fewer units when prices are high, and buy <strong>significantly more units</strong> when the market falls. This averages out your cost over time and prevents you from "timing the market" incorrectly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Matching Mutual Funds panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4" id="matched-funds-card">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-sans font-bold text-base text-slate-900">
              Matched Funds for Expected Returns
            </h3>
            <p className="text-xs text-slate-400">
              These Mutual Funds in our directory historically target or support your specified Return target of <span className="text-emerald-500 font-bold">{calcMode === 'sip' ? sipRate : lumpsumRate}%</span> CAGR.
            </p>
          </div>
          <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AI Verified Matches</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="matched-funds-list">
          {recommendedFunds.map((fund) => (
            <div 
              key={fund.id}
              onClick={() => onExploreFund(fund)}
              className="cursor-pointer group flex items-center justify-between border border-slate-100 p-4 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/10 transition-all hover:shadow-sm"
            >
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                  {fund.subCategory}
                </span>
                <h4 className="font-sans font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">
                  {fund.name}
                </h4>
                <div className="flex items-center space-x-3 text-[11px] font-bold text-slate-400">
                  <span>AUM: {fund.aum}</span>
                  <span>•</span>
                  <span>Exp. Ratio: {fund.expenseRatio}%</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">3Y Return</span>
                  <span className="text-sm font-extrabold text-emerald-500">{fund.cagr3y}% CAGR</span>
                </div>
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 group-hover:bg-emerald-500 group-hover:text-white text-slate-400 transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
