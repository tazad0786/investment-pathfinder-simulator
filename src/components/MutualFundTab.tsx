import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Percent, ShieldCheck, Compass, Info, ArrowUpRight, 
  Sparkles, X, ChevronRight, Calculator, CheckCircle2 
} from 'lucide-react';
import { MutualFund, UserPortfolio } from '../types';

interface MutualFundTabProps {
  funds: MutualFund[];
  portfolio: UserPortfolio;
  onInvestFund: (fund: MutualFund, amount: number, isSip: boolean) => void;
  selectedFundId: string | null;
  setSelectedFundId: (id: string | null) => void;
}

export default function MutualFundTab({
  funds,
  portfolio,
  onInvestFund,
  selectedFundId,
  setSelectedFundId
}: MutualFundTabProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Equity' | 'Debt' | 'Hybrid' | 'Index'>('All');
  
  // Investing states
  const [investMode, setInvestMode] = useState<'sip' | 'lumpsum'>('sip');
  const [investAmount, setInvestAmount] = useState<number>(5000);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  // Active fund details object
  const activeFund = useMemo(() => {
    return funds.find(f => f.id === selectedFundId) || null;
  }, [funds, selectedFundId]);

  // Filtered funds list
  const filteredFunds = useMemo(() => {
    if (activeCategory === 'All') return funds;
    return funds.filter(f => f.category === activeCategory);
  }, [funds, activeCategory]);

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFund || investAmount <= 0) return;

    if (investMode === 'sip' && investAmount < activeFund.minSip) {
      alert(`Minimum SIP amount for this fund is ₹${activeFund.minSip}.`);
      return;
    } else if (investMode === 'lumpsum' && investAmount < 5000) {
      alert("Minimum lump sum investment amount is ₹5,000.");
      return;
    }

    if (investAmount > portfolio.balance) {
      alert("Insufficient mock cash balance to complete this transaction.");
      return;
    }

    // Process investment
    onInvestFund(activeFund, investAmount, investMode === 'sip');
    setTradeSuccess(
      investMode === 'sip' 
        ? `Successfully registered SIP of ₹${investAmount.toLocaleString('en-IN')}/month in ${activeFund.name}!`
        : `Successfully invested Lumpsum of ₹${investAmount.toLocaleString('en-IN')} in ${activeFund.name}!`
    );

    // Reset success banner
    setTimeout(() => {
      setTradeSuccess(null);
    }, 4500);
  };

  return (
    <div className="space-y-6 py-2" id="mf-panel-root">
      {/* Category selector row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans font-extrabold text-xl tracking-tight text-slate-900">
            Mutual Fund Clusters
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare 3Y/5Y Compound CAGRs and expense metrics. Learn where institutional money compounds safely.
          </p>
        </div>

        {/* Horizontal scroll category filters */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none" id="mf-category-scroller">
          {(['All', 'Equity', 'Debt', 'Hybrid', 'Index'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedFundId(null);
              }}
              className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/10'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:text-slate-800'
              }`}
            >
              {cat === 'All' ? 'All Funds' : `${cat} Funds`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="mf-workspace">
        {/* Left column: List of Funds (7 columns) */}
        <div className="lg:col-span-7 space-y-4" id="mf-list-pane">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFunds.map((fund) => {
              const isEquity = fund.category === 'Equity';
              const isDebt = fund.category === 'Debt';
              return (
                <div
                  key={fund.id}
                  id={`mf-grid-card-${fund.id}`}
                  onClick={() => {
                    setSelectedFundId(fund.id);
                    setInvestAmount(Math.max(5000, fund.minSip));
                  }}
                  className={`cursor-pointer bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all hover:shadow-md hover:scale-[1.01] ${
                    selectedFundId === fund.id 
                      ? 'border-emerald-500 ring-1 ring-emerald-500/5 shadow-sm' 
                      : 'border-slate-100'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        isEquity ? 'bg-indigo-50 text-indigo-700' :
                        isDebt ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {fund.subCategory}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Risk: {fund.riskRating}</span>
                    </div>

                    <h3 className="font-sans font-bold text-sm text-slate-800 line-clamp-2 leading-tight">
                      {fund.name}
                    </h3>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-3">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-semibold text-slate-400 uppercase">3Y CAGR Return</span>
                      <span className="text-sm font-black text-emerald-500">{fund.cagr3y}%</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="block text-[8px] font-semibold text-slate-400 uppercase">Expense Ratio</span>
                      <span className="text-xs font-bold text-slate-600">{fund.expenseRatio}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Fund Details (5 columns) */}
        <div className="lg:col-span-5" id="mf-detail-pane">
          {activeFund ? (
            <div className="sticky top-20 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6" id="active-fund-card">
              {/* Header block */}
              <div className="flex items-start justify-between border-b border-slate-50 pb-4">
                <div className="space-y-0.5">
                  <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {activeFund.category} Fund
                  </span>
                  <h2 className="font-sans font-extrabold text-sm text-slate-850 leading-tight">
                    {activeFund.name}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedFundId(null)}
                  className="cursor-pointer p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* NAV Chart */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current NAV Net asset value</span>
                  <span className="font-sans font-extrabold text-slate-800 text-sm">
                    ₹{activeFund.history[activeFund.history.length - 1]?.nav || 100.00}
                  </span>
                </div>

                <div className="h-32 pt-2" id="fund-historical-mini-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={activeFund.history}
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="nav"
                        stroke="#10B981"
                        fill="#D1FAE5"
                        fillOpacity={0.4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fund details scorecard */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-xl text-center" id="fund-ratios-scorecard">
                <div>
                  <span className="block text-[8px] font-semibold text-slate-400 uppercase">AUM Size</span>
                  <span className="font-sans font-extrabold text-xs text-slate-700">{activeFund.aum}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-semibold text-slate-400 uppercase">Exp. Ratio</span>
                  <span className="font-sans font-extrabold text-xs text-slate-700">{activeFund.expenseRatio}%</span>
                </div>
                <div>
                  <span className="block text-[8px] font-semibold text-slate-400 uppercase">Risk Index</span>
                  <span className="font-sans font-extrabold text-[9px] text-rose-500 uppercase">{activeFund.riskRating}</span>
                </div>
              </div>

              {/* Core holdings table */}
              <div className="space-y-2" id="fund-holdings-list">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Top Portfolio Holdings</span>
                <div className="divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden text-xs">
                  {activeFund.holdings.map((hold, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50/20">
                      <span className="font-sans font-medium text-slate-600 truncate">{hold.name}</span>
                      <span className="font-mono font-bold text-slate-700">{hold.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invest form panel */}
              <div className="border-t border-slate-100 pt-5 space-y-4" id="fund-investment-form-card">
                {tradeSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold">
                    {tradeSuccess}
                  </div>
                )}

                <div className="flex bg-slate-100 p-1 rounded-lg" id="invest-mode-toggle">
                  <button
                    type="button"
                    onClick={() => {
                      setInvestMode('sip');
                      setInvestAmount(activeFund.minSip);
                    }}
                    className={`cursor-pointer flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      investMode === 'sip' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Monthly SIP (Regulated)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvestMode('lumpsum');
                      setInvestAmount(5000);
                    }}
                    className={`cursor-pointer flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      investMode === 'lumpsum' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Lumpsum (One-time)
                  </button>
                </div>

                <form onSubmit={handleInvest} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      {investMode === 'sip' ? 'Monthly SIP Amount' : 'Investment Amount'}
                    </span>
                    <input
                      type="number"
                      min={investMode === 'sip' ? activeFund.minSip : 5000}
                      value={investAmount}
                      onChange={(e) => setInvestAmount(Math.max(50, +e.target.value))}
                      className="w-28 bg-slate-50 border border-slate-200 rounded-md py-1 px-2 text-right text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  {investMode === 'sip' && (
                    <div className="text-[10px] text-slate-400 font-bold bg-slate-50/50 p-2.5 rounded-lg">
                      * Min SIP parameter: <strong>₹{activeFund.minSip}</strong>. The SIP triggers automatically on the same day every calendar month.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="cursor-pointer w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all bg-emerald-500 hover:bg-emerald-600 hover:shadow hover:scale-[1.01]"
                  >
                    {investMode === 'sip' ? 'Start Monthly SIP' : 'Invest Lump Sum'}
                  </button>
                </form>
              </div>

              {/* Fund manager details */}
              <div className="text-[9px] font-bold text-slate-400 bg-slate-50 px-3 py-2.5 rounded-lg flex justify-between items-center">
                <span>Fund Lead Managers:</span>
                <span className="text-slate-600 truncate">{activeFund.managers.join(', ')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 space-y-3 sticky top-20" id="empty-mf-detail">
              <Calculator className="h-8 w-8 text-slate-300 mx-auto" />
              <h3 className="font-sans font-bold text-sm text-slate-700">Select a Mutual Fund</h3>
              <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                Explore our index, equity, debt, and hybrid fund buckets on the left, then click on any card to view detailed fund manager portfolios, mappings, and start compounding.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
