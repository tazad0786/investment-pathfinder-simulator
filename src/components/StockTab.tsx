import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, ArrowRight, ShieldCheck, 
  Search, Filter, ChevronRight, X, AlertCircle, ShoppingCart 
} from 'lucide-react';
import { Stock, UserPortfolio } from '../types';

interface StockTabProps {
  stocks: Stock[];
  portfolio: UserPortfolio;
  onBuyStock: (stock: Stock, quantity: number) => void;
  onSellStock: (stock: Stock, quantity: number) => void;
  selectedStockId: string | null;
  setSelectedStockId: (id: string | null) => void;
}

export default function StockTab({
  stocks,
  portfolio,
  onBuyStock,
  onSellStock,
  selectedStockId,
  setSelectedStockId
}: StockTabProps) {
  // Filter states
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [peFilter, setPeFilter] = useState<string>('All');

  // Buy/Sell transaction states
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  // Active details stock object
  const activeStock = useMemo(() => {
    return stocks.find(s => s.id === selectedStockId) || null;
  }, [stocks, selectedStockId]);

  // Available sectors
  const sectors = useMemo(() => {
    return ['All', ...Array.from(new Set(stocks.map(s => s.sector)))];
  }, [stocks]);

  // Screened Stocks list
  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      if (sectorFilter !== 'All' && stock.sector !== sectorFilter) return false;
      if (riskFilter !== 'All' && stock.risk !== riskFilter) return false;
      
      if (peFilter === 'Low' && stock.peRatio >= 25) return false;
      if (peFilter === 'High' && stock.peRatio < 25) return false;
      
      return true;
    });
  }, [stocks, sectorFilter, riskFilter, peFilter]);

  // Check how many shares of this active stock the user currently owns
  const ownedQuantity = useMemo(() => {
    if (!activeStock) return 0;
    const item = portfolio.items.find(p => p.assetType === 'stock' && p.assetId === activeStock.id);
    return item ? item.quantity : 0;
  }, [portfolio, activeStock]);

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStock || tradeQuantity <= 0) return;

    if (tradeAction === 'buy') {
      const cost = activeStock.price * tradeQuantity;
      if (cost > portfolio.balance) {
        alert("Insufficient balance to execute buy order.");
        return;
      }
      onBuyStock(activeStock, tradeQuantity);
      setTradeSuccess(`Successfully bought ${tradeQuantity} shares of ${activeStock.ticker}!`);
    } else {
      if (tradeQuantity > ownedQuantity) {
        alert("You cannot sell more shares than you currently own.");
        return;
      }
      onSellStock(activeStock, tradeQuantity);
      setTradeSuccess(`Successfully sold ${tradeQuantity} shares of ${activeStock.ticker}!`);
    }

    // Reset success banner after 4 seconds
    setTimeout(() => {
      setTradeSuccess(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 py-2" id="stocks-panel-root">
      {/* Search and Screeners row */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4" id="stocks-screener-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-sans font-extrabold text-xl tracking-tight text-slate-900">
              Equity Stock Screener
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter by valuation metrics, profit growth, and sector trends to make highly informed buy decisions.
            </p>
          </div>

          <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Simulated Prices Ticking Live</span>
          </div>
        </div>

        {/* Filters Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" id="screener-selectors">
          {/* Sector */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sector Sector</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
            >
              {sectors.map((s, idx) => (
                <option key={idx} value={s}>{s === 'All' ? 'All Sectors' : s}</option>
              ))}
            </select>
          </div>

          {/* Risk profile */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Multiplier</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low Risk (Stable Blue chips)</option>
              <option value="Medium">Medium Risk (Growth conglomerates)</option>
              <option value="High">High Risk (Hyper growth tech)</option>
            </select>
          </div>

          {/* Valuation (PE ratio) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valuation (P/E Ratio)</span>
            <select
              value={peFilter}
              onChange={(e) => setPeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="All">All Valuations</option>
              <option value="Low">Low Valuation (P/E &lt; 25)</option>
              <option value="High">Premium Valuation (P/E &ge; 25)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="stocks-split-workspace">
        {/* Left Side: Stocks List (7 columns) */}
        <div className="lg:col-span-7 space-y-3" id="screener-results-pane">
          {filteredStocks.length === 0 ? (
            <div className="border border-slate-100 rounded-2xl p-8 bg-white text-center text-slate-500 space-y-2">
              <AlertCircle className="h-6 w-6 text-slate-400 mx-auto" />
              <h3 className="font-sans font-bold text-sm text-slate-700">No matching stocks found</h3>
              <p className="text-xs text-slate-400">Try loosening your screener parameters above.</p>
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const isUp = stock.change >= 0;
              const isSelected = selectedStockId === stock.id;
              return (
                <div
                  key={stock.id}
                  id={`stock-row-${stock.ticker}`}
                  onClick={() => {
                    setSelectedStockId(stock.id);
                    setTradeQuantity(1);
                  }}
                  className={`cursor-pointer flex items-center justify-between border p-4 bg-white rounded-2xl transition-all ${
                    isSelected 
                      ? 'border-emerald-500 ring-1 ring-emerald-500/10 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-350 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-1 max-w-[60%]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                        {stock.ticker}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        stock.risk === 'Low' ? 'bg-emerald-50 text-emerald-700' :
                        stock.risk === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {stock.risk} Risk
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-xs text-slate-500 truncate">
                      {stock.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Sector: {stock.sector} • PE: {stock.peRatio}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="block font-mono text-sm font-extrabold text-slate-800">
                        ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <div className={`flex items-center justify-end text-[10px] font-bold ${
                        isUp ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {isUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                        <span>
                          {isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4.5 w-4.5 text-slate-300" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Stock details + Mock trading panel (5 columns) */}
        <div className="lg:col-span-5" id="stock-detail-section">
          {activeStock ? (
            <div className="sticky top-20 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-6" id="active-stock-card">
              {/* Header block */}
              <div className="flex items-start justify-between border-b border-slate-50 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base font-black text-slate-900 uppercase">
                      {activeStock.ticker}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">| {activeStock.sector}</span>
                  </div>
                  <h2 className="font-sans font-bold text-sm text-slate-500">
                    {activeStock.name}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedStockId(null)}
                  className="cursor-pointer p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sparkline mini chart using Recharts */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-black text-slate-900">
                    ₹{activeStock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-xs font-bold ${activeStock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeStock.change >= 0 ? '+' : ''}{activeStock.change.toFixed(2)} ({activeStock.changePercent.toFixed(2)}%)
                  </span>
                </div>

                <div className="h-32 pt-2" id="stock-historical-mini-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={activeStock.history}
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    >
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 10', 'dataMax + 10']}
                        tick={{ fontSize: 9, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={activeStock.change >= 0 ? '#10B981' : '#F43F5E'}
                        fill={activeStock.change >= 0 ? '#E6F4EA' : '#FCE8E6'}
                        fillOpacity={0.4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ratios & Fundamentals step info */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-3" id="fundamentals-brief">
                <h4 className="font-sans font-extrabold text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                  Fundamental Matrix Screener
                </h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div className="space-y-0.5">
                    <span className="flex items-center text-[10px] font-bold text-slate-400">
                      P/E Ratio
                    </span>
                    <span className="block font-sans font-black text-xs text-slate-800">
                      {activeStock.peRatio}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold text-slate-400">Debt to Equity</span>
                    <span className="block font-sans font-black text-xs text-slate-800">
                      {activeStock.debtToEquity}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold text-slate-400">Div. Yield</span>
                    <span className="block font-sans font-black text-xs text-slate-800">
                      {activeStock.dividendYield}%
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold text-slate-400">3Y Profit CAGR</span>
                    <span className="block font-sans font-black text-xs text-slate-500">
                      +{activeStock.profitGrowth3y}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Trade Action section */}
              <div className="border-t border-slate-100 pt-5 space-y-4" id="stock-trade-module">
                {tradeSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold leading-normal">
                    {tradeSuccess}
                  </div>
                )}

                <div className="flex bg-slate-100 p-1 rounded-lg" id="trade-action-toggle">
                  <button
                    type="button"
                    onClick={() => setTradeAction('buy')}
                    className={`cursor-pointer flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      tradeAction === 'buy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Buy (Add shares)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeAction('sell')}
                    disabled={ownedQuantity === 0}
                    className={`cursor-pointer flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      tradeAction === 'sell' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 disabled:opacity-40'
                    }`}
                  >
                    Sell (Owned: {ownedQuantity})
                  </button>
                </div>

                <form onSubmit={handleExecuteTrade} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(Math.max(1, +e.target.value))}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-md py-1 px-2.5 text-right text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-dashed border-slate-150 pt-2 text-xs font-bold text-slate-600">
                    <span>Brokerage</span>
                    <span className="text-emerald-500">Free (₹0)</span>
                  </div>

                  <div className="flex items-center justify-between font-bold text-sm text-slate-800">
                    <span>Estimated Cost</span>
                    <span>₹{(activeStock.price * tradeQuantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <button
                    type="submit"
                    className={`cursor-pointer w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:shadow hover:scale-[1.01] ${
                      tradeAction === 'buy' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                    }`}
                  >
                    Confirm {tradeAction === 'buy' ? 'Buy Order' : 'Sell Order'}
                  </button>
                </form>
              </div>

              {/* Education helper */}
              <div className="text-[10px] leading-relaxed text-slate-400 font-bold bg-slate-50 p-3 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Tip on P/E Ratio:</strong> A high Price-to-Earnings (P/E) multiple implies investors expect rapid growth, but carries premium risk. A low P/E might indicate a bargains or value trap.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 space-y-3 sticky top-20" id="empty-stock-detail">
              <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto" />
              <h3 className="font-sans font-bold text-sm text-slate-700">Select a Stock</h3>
              <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                Explore our list or refine filters on the left, then click on any stock to view detailed financial compounding metrics, charts, and execute mock trades.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
