import React, { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, Award, 
  Percent, ArrowRightLeft, ShieldCheck, Compass, HelpCircle, History 
} from 'lucide-react';
import { UserPortfolio, PortfolioItem } from '../types';

interface PortfolioViewProps {
  portfolio: UserPortfolio;
  onNavigateTab: (tab: string) => void;
  transactionsLog: string[];
}

export default function PortfolioView({ portfolio, onNavigateTab, transactionsLog }: PortfolioViewProps) {
  
  // Compute global portfolio summary metrics
  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    
    portfolio.items.forEach(item => {
      totalInvested += item.investedAmount;
      totalCurrentValue += item.currentValue;
    });

    const totalReturns = totalCurrentValue - totalInvested;
    const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    return {
      invested: totalInvested,
      current: totalCurrentValue,
      returns: totalReturns,
      percent: returnsPercentage
    };
  }, [portfolio]);

  const stocksOwned = useMemo(() => {
    return portfolio.items.filter(item => item.assetType === 'stock');
  }, [portfolio]);

  const fundsOwned = useMemo(() => {
    return portfolio.items.filter(item => item.assetType === 'mf');
  }, [portfolio]);

  const activeSipsCount = useMemo(() => {
    return portfolio.items.filter(item => item.isSip).length;
  }, [portfolio]);

  const isProfitable = summary.returns >= 0;

  return (
    <div className="space-y-8 py-2" id="portfolio-root">
      
      {/* Educational Greeting Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg shadow-slate-900/10">
        <div className="absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl"></div>

        <div className="space-y-3 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-400/20">
              Virtual Account Live
            </span>
            <span className="text-[9px] font-bold text-slate-400">ID: WW-83921</span>
          </div>
          <h2 className="font-sans font-black text-xl tracking-tight leading-none">
            Welcome to WealthWise<span className="text-emerald-500">.ai</span> Compounder!
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Learn investing risk-free! We have provisioned your account with <strong>₹1,00,000.00</strong> of free, live simulated currency. Complete steps in the Pathfinder Wizard to design your thesis, or make mock buy/SIP trades!
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('wizard')}
          className="cursor-pointer flex items-center space-x-2 bg-emerald-500 text-slate-950 px-5 py-3 rounded-xl text-xs font-bold transition-all hover:bg-emerald-400 hover:shadow-lg hover:scale-[1.02] shrink-0 z-10"
          id="get-started-pathfinder-btn"
        >
          <Compass className="h-4 w-4" />
          <span>Launch Pathfinder steps</span>
        </button>
      </div>

      {/* Global Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="portfolio-stats-grid">
        {/* Total Value */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Portfolio Value</span>
          <span className="block font-sans font-black text-2xl text-slate-900">
            ₹{summary.current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center text-[10px] font-bold text-slate-400">
            <span>Overall value compounded</span>
          </div>
        </div>

        {/* Invested Amount */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Invested Amount</span>
          <span className="block font-sans font-black text-2xl text-slate-900">
            ₹{summary.invested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center text-[10px] font-bold text-slate-400">
            <span>Primary simulated capital</span>
          </div>
        </div>

        {/* Total Returns */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. Compound Returns</span>
          <span className={`block font-sans font-black text-2xl ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isProfitable ? '+' : ''}₹{summary.returns.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center text-[10px] font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isProfitable ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-0.5" />}
            <span>{summary.percent.toFixed(2)}% Return</span>
          </div>
        </div>

        {/* Balance & Active SIPs */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Monthly SIPs</span>
          <span className="block font-sans font-black text-2xl text-indigo-500">
            {activeSipsCount} Registered
          </span>
          <div className="flex items-center text-[10px] font-bold text-slate-400">
            <span>Automatic monthly growth</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-tables-layout">
        
        {/* Left Side: Active Holdings Tables (8 columns) */}
        <div className="lg:col-span-8 space-y-8" id="dashboard-holdings-tables">
          
          {/* 1. STOCKS OWNED */}
          <div className="space-y-3" id="stocks-holdings-card">
            <h3 className="font-sans font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span>Stocks Portfolio Holdings ({stocksOwned.length})</span>
            </h3>

            {stocksOwned.length === 0 ? (
              <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-400 font-bold">You do not own any individual stocks yet.</p>
                <button
                  onClick={() => onNavigateTab('stocks')}
                  className="cursor-pointer text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                >
                  Explore Stocks Screener
                </button>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm" id="stocks-holdings-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Ticker</th>
                        <th className="p-4">Shares Own</th>
                        <th className="p-4">Avg Buy</th>
                        <th className="p-4">Current Price</th>
                        <th className="p-4 text-right">Returns</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {stocksOwned.map((item) => {
                        const isStockUp = item.returns >= 0;
                        return (
                          <tr 
                            key={item.id} 
                            onClick={() => onNavigateTab('stocks')}
                            className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                          >
                            <td className="p-4">
                              <div className="font-mono font-extrabold text-slate-800">{item.tickerOrCategory}</div>
                              <div className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{item.assetName}</div>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-600">{item.quantity}</td>
                            <td className="p-4 font-mono font-bold text-slate-600">₹{item.avgBuyPrice.toFixed(1)}</td>
                            <td className="p-4 font-mono font-bold text-slate-800">₹{item.currentPrice.toFixed(1)}</td>
                            <td className="p-4 text-right">
                              <span className={`block font-mono font-extrabold ${isStockUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isStockUp ? '+' : ''}₹{item.returns.toFixed(1)}
                              </span>
                              <span className={`block text-[9px] font-black ${isStockUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isStockUp ? '▲' : '▼'} {item.returnsPercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 2. MUTUAL FUNDS OWNED */}
          <div className="space-y-3" id="mfs-holdings-card">
            <h3 className="font-sans font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
              <span>Mutual Fund Holdings ({fundsOwned.length})</span>
            </h3>

            {fundsOwned.length === 0 ? (
              <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-400 font-bold">You do not own any mutual fund certificates yet.</p>
                <button
                  onClick={() => onNavigateTab('funds')}
                  className="cursor-pointer text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                >
                  Explore Mutual Funds
                </button>
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm" id="mfs-holdings-table">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Fund Scheme</th>
                        <th className="p-4">SIP Config</th>
                        <th className="p-4">Invested Value</th>
                        <th className="p-4">Current Valuation</th>
                        <th className="p-4 text-right">Returns</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {fundsOwned.map((item) => {
                        const isFundUp = item.returns >= 0;
                        return (
                          <tr 
                            key={item.id}
                            onClick={() => onNavigateTab('funds')}
                            className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                          >
                            <td className="p-4">
                              <div className="font-sans font-extrabold text-slate-800 line-clamp-1">{item.assetName}</div>
                              <span className="inline-block text-[9px] font-black text-indigo-600 bg-indigo-55/10 px-1.5 py-0.5 rounded uppercase">
                                {item.tickerOrCategory}
                              </span>
                            </td>
                            <td className="p-4">
                              {item.isSip ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/40">
                                  SIP: ₹{item.sipAmount}/mo
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold">Lump sum</span>
                              )}
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-600">₹{item.investedAmount.toLocaleString('en-IN')}</td>
                            <td className="p-4 font-mono font-bold text-slate-800">₹{item.currentValue.toLocaleString('en-IN')}</td>
                            <td className="p-4 text-right">
                              <span className={`block font-mono font-extrabold ${isFundUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isFundUp ? '+' : ''}₹{item.returns.toLocaleString('en-IN')}
                              </span>
                              <span className={`block text-[9px] font-black ${isFundUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isFundUp ? '▲' : '▼'} {item.returnsPercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Ledger Log and Advisor suggestions (4 columns) */}
        <div className="lg:col-span-4 space-y-6" id="dashboard-ledger-pane">
          
          {/* Transactions Log */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4" id="ledger-box">
            <h3 className="font-sans font-black text-xs text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
              <History className="h-4 w-4" />
              <span>Executed Ledger Logs</span>
            </h3>

            {transactionsLog.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-6">
                Your activity timeline will populate as you execute trades.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1" id="ledger-history">
                {transactionsLog.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                    <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                    <span className="leading-normal">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Educational Quick Links */}
          <div className="bg-emerald-50/20 border border-emerald-100 rounded-2xl p-5 space-y-4" id="advice-quick-panel">
            <h4 className="font-sans font-bold text-sm text-emerald-800 flex items-center space-x-1.5">
              <Award className="h-4 w-4 text-emerald-600" />
              <span>Compounding Rules for Beginners</span>
            </h4>
            
            <ul className="space-y-3.5 text-xs text-slate-600">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold shrink-0">1.</span>
                <span><strong>Rupee Cost Averaging</strong> is automatically handled in our Mutual Funds tab via SIP configurations.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold shrink-0">2.</span>
                <span>Look for stocks with a <strong>low Debt-to-Equity</strong> ratio (&lt;1.0) and high profit CAGRs to compound stress-free.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold shrink-0">3.</span>
                <span>Always match risk with age: subtract your age from 100 to find your ideal Equity allocation percentage.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
