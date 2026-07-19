import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import * as motionModule from 'motion/react';

// Import local components
import Header from './components/Header';
import PortfolioView from './components/PortfolioView';
import StockTab from './components/StockTab';
import MutualFundTab from './components/MutualFundTab';
import DecisionWizard from './components/DecisionWizard';
import Calculators from './components/Calculators';
import WealthWiseAICoach from './components/WealthWiseAICoach';

// Import initial data structures
import { mockStocks as baseStocks, mockMutualFunds, initialPortfolio } from './data/mockData';
import { UserPortfolio, PortfolioItem, UserProfile, Stock, MutualFund } from './types';

// Extract Motion elements safely
const motion = (motionModule as any).motion || {
  div: ({ children, ...props }: any) => <div {...props}>{children}</div>
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // 1. Portfolio state backed by LocalStorage
  const [portfolio, setPortfolio] = useState<UserPortfolio>(() => {
    try {
      const saved = localStorage.getItem('wealthwise_portfolio');
      return saved ? JSON.parse(saved) : initialPortfolio;
    } catch {
      return initialPortfolio;
    }
  });

  // 2. Live Stocks pricing state
  const [stocks, setStocks] = useState<Stock[]>(() => {
    try {
      const saved = localStorage.getItem('wealthwise_live_stocks');
      return saved ? JSON.parse(saved) : baseStocks;
    } catch {
      return baseStocks;
    }
  });

  // 3. Transactions chronological audit logs
  const [transactionsLog, setTransactionsLog] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wealthwise_transactions_log');
      return saved ? JSON.parse(saved) : [
        "Account created: Provisioned ₹1,00,000.00 mock trading balance.",
        "Purchase execution: Bought 10 shares of RELIANCE @ ₹2400.00",
        "Purchase execution: Initiated flexicap Mutual Fund compilation."
      ];
    } catch {
      return [];
    }
  });

  // 4. Custom user quiz questionnaire profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('wealthwise_user_profile');
      return saved ? JSON.parse(saved) : {
        name: "Guest Investor",
        riskTolerance: "Not Sure",
        goal: "Not Sure",
        horizon: 5,
        monthlyInvestmentCapacity: 5000,
        isCompleted: false
      };
    } catch {
      return {
        name: "Guest Investor",
        riskTolerance: "Not Sure",
        goal: "Not Sure",
        horizon: 5,
        monthlyInvestmentCapacity: 5000,
        isCompleted: false
      };
    }
  });

  // Selected asset detail parameters (helps redirecting/exploring from calculators/wizard)
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);

  // Drawer modal state for Advisor
  const [isAiCoachOpen, setIsAiCoachOpen] = useState<boolean>(false);

  // Save states to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('wealthwise_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('wealthwise_live_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('wealthwise_transactions_log', JSON.stringify(transactionsLog));
  }, [transactionsLog]);

  useEffect(() => {
    localStorage.setItem('wealthwise_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // SIMULATE REAL-TIME STOCK TICKERS BACKGROUND PROCESS
  // Slight price movements +/- 0.1% to 0.4% every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks => {
        const updated = prevStocks.map(stock => {
          // 40% chance of a minor price update per interval tick
          if (Math.random() > 0.4) return stock;

          const volatility = 0.003; // max 0.3% price move
          const direction = Math.random() > 0.48 ? 1 : -1; // slight upward drift
          const deltaPrice = stock.price * (Math.random() * volatility) * direction;
          const newPrice = Math.max(1, +(stock.price + deltaPrice).toFixed(2));
          
          const change = +(stock.change + deltaPrice).toFixed(2);
          const changePercent = +(change / (newPrice - change) * 100).toFixed(2);

          // Update sparkline trend
          const newSparkline = [...stock.sparkline.slice(1), Math.round(newPrice)];

          return {
            ...stock,
            price: newPrice,
            change: change,
            changePercent: changePercent,
            sparkline: newSparkline
          };
        });

        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Recalculate portfolio value matching live ticking stocks
  useEffect(() => {
    setPortfolio(prevPortfolio => {
      let updatedItems = prevPortfolio.items.map(item => {
        if (item.assetType === 'stock') {
          const liveStock = stocks.find(s => s.id === item.assetId);
          if (liveStock) {
            const currentVal = liveStock.price * item.quantity;
            const returns = currentVal - item.investedAmount;
            const returnsPct = item.investedAmount > 0 ? (returns / item.investedAmount) * 100 : 0;
            return {
              ...item,
              currentPrice: liveStock.price,
              currentValue: +currentVal.toFixed(2),
              returns: +returns.toFixed(2),
              returnsPercentage: +returnsPct.toFixed(2)
            };
          }
        }
        return item;
      });

      // Check if items changed to avoid infinite loops
      const matches = JSON.stringify(prevPortfolio.items) === JSON.stringify(updatedItems);
      if (matches) return prevPortfolio;

      return {
        ...prevPortfolio,
        items: updatedItems
      };
    });
  }, [stocks]);

  // 1. Callback: Buy/Trade Stocks
  const handleBuyStock = (stock: Stock, qty: number) => {
    const totalCost = +(stock.price * qty).toFixed(2);
    if (totalCost > portfolio.balance) return;

    setPortfolio(prev => {
      const existingIdx = prev.items.findIndex(item => item.assetType === 'stock' && item.assetId === stock.id);
      let updatedItems = [...prev.items];

      if (existingIdx !== -1) {
        const existing = prev.items[existingIdx];
        const newQty = existing.quantity + qty;
        const newInvested = +(existing.investedAmount + totalCost).toFixed(2);
        const newAvg = +(newInvested / newQty).toFixed(2);
        const currentVal = +(stock.price * newQty).toFixed(2);
        const returns = +(currentVal - newInvested).toFixed(2);
        const returnsPct = +(returns / newInvested * 100).toFixed(2);

        updatedItems[existingIdx] = {
          ...existing,
          quantity: newQty,
          avgBuyPrice: newAvg,
          investedAmount: newInvested,
          currentValue: currentVal,
          returns: returns,
          returnsPercentage: returnsPct
        };
      } else {
        const newItem: PortfolioItem = {
          id: `p-item-${Date.now()}`,
          assetType: 'stock',
          assetId: stock.id,
          assetName: stock.name,
          tickerOrCategory: stock.ticker,
          quantity: qty,
          avgBuyPrice: stock.price,
          currentPrice: stock.price,
          investedAmount: totalCost,
          currentValue: totalCost,
          returns: 0,
          returnsPercentage: 0
        };
        updatedItems.push(newItem);
      }

      const nextBalance = +(prev.balance - totalCost).toFixed(2);
      
      // Update journal log
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTransactionsLog(logs => [
        `[${timeStr}] BUY: Acquired ${qty} shares of ${stock.ticker} @ ₹${stock.price.toFixed(1)} (Total Cost: ₹${totalCost.toLocaleString('en-IN')})`,
        ...logs
      ]);

      return {
        balance: nextBalance,
        items: updatedItems
      };
    });
  };

  // 2. Callback: Sell/Trade Stocks
  const handleSellStock = (stock: Stock, qty: number) => {
    setPortfolio(prev => {
      const existingIdx = prev.items.findIndex(item => item.assetType === 'stock' && item.assetId === stock.id);
      if (existingIdx === -1) return prev;

      const existing = prev.items[existingIdx];
      if (qty > existing.quantity) return prev;

      let updatedItems = [...prev.items];
      const revenue = +(stock.price * qty).toFixed(2);
      const nextBalance = +(prev.balance + revenue).toFixed(2);

      if (qty === existing.quantity) {
        // Complete liquidation of this holding
        updatedItems.splice(existingIdx, 1);
      } else {
        const newQty = existing.quantity - qty;
        // Keep average purchase cost constant, scale invested amount
        const newInvested = +(existing.avgBuyPrice * newQty).toFixed(2);
        const currentVal = +(stock.price * newQty).toFixed(2);
        const returns = +(currentVal - newInvested).toFixed(2);
        const returnsPct = +(returns / newInvested * 100).toFixed(2);

        updatedItems[existingIdx] = {
          ...existing,
          quantity: newQty,
          investedAmount: newInvested,
          currentValue: currentVal,
          returns: returns,
          returnsPercentage: returnsPct
        };
      }

      // Update journal log
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTransactionsLog(logs => [
        `[${timeStr}] SELL: Liquidated ${qty} shares of ${stock.ticker} @ ₹${stock.price.toFixed(1)} (Revenue: +₹${revenue.toLocaleString('en-IN')})`,
        ...logs
      ]);

      return {
        balance: nextBalance,
        items: updatedItems
      };
    });
  };

  // 3. Callback: Invest in Mutual Fund (SIP or Lumpsum)
  const handleInvestFund = (fund: MutualFund, amount: number, isSip: boolean) => {
    if (amount > portfolio.balance) return;

    setPortfolio(prev => {
      const existingIdx = prev.items.findIndex(item => item.assetType === 'mf' && item.assetId === fund.id);
      let updatedItems = [...prev.items];
      
      const nav = fund.history[fund.history.length - 1]?.nav || 100;
      const calculatedUnits = +(amount / nav).toFixed(3);

      if (existingIdx !== -1) {
        const existing = prev.items[existingIdx];
        const newUnits = +(existing.quantity + calculatedUnits).toFixed(3);
        const newInvested = +(existing.investedAmount + amount).toFixed(2);
        const newAvg = +(newInvested / newUnits).toFixed(2);
        const currentVal = +(nav * newUnits).toFixed(2);
        const returns = +(currentVal - newInvested).toFixed(2);
        const returnsPct = +(returns / newInvested * 100).toFixed(2);

        updatedItems[existingIdx] = {
          ...existing,
          quantity: newUnits,
          avgBuyPrice: newAvg,
          investedAmount: newInvested,
          currentValue: currentVal,
          returns: returns,
          returnsPercentage: returnsPct,
          isSip: isSip || existing.isSip,
          sipAmount: isSip ? amount : existing.sipAmount
        };
      } else {
        const newItem: PortfolioItem = {
          id: `p-item-${Date.now()}`,
          assetType: 'mf',
          assetId: fund.id,
          assetName: fund.name,
          tickerOrCategory: fund.subCategory,
          quantity: calculatedUnits,
          avgBuyPrice: nav,
          currentPrice: nav,
          investedAmount: amount,
          currentValue: amount,
          returns: 0,
          returnsPercentage: 0,
          isSip: isSip,
          sipAmount: isSip ? amount : undefined
        };
        updatedItems.push(newItem);
      }

      const nextBalance = +(prev.balance - amount).toFixed(2);

      // Update journal log
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTransactionsLog(logs => [
        `[${timeStr}] INVEST: ${isSip ? 'SIP Registered' : 'Lump Sum'} in ${fund.name} (Amount: ₹${amount.toLocaleString('en-IN')} | Transferred ${calculatedUnits} NAV units)`,
        ...logs
      ]);

      return {
        balance: nextBalance,
        items: updatedItems
      };
    });
  };

  // Redirect / helper functions
  const handleExploreStock = (stock: Stock) => {
    setSelectedStockId(stock.id);
    setActiveTab('stocks');
  };

  const handleExploreFund = (fund: MutualFund) => {
    setSelectedFundId(fund.id);
    setActiveTab('funds');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="wealthwise-app-root">
      {/* WealthWise Header Navigation */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If moving between tabs, do not force-close detail overlays but keep state organized
        }} 
        balance={portfolio.balance}
        openAiCoach={() => setIsAiCoachOpen(true)}
      />

      {/* Primary Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8" id="primary-workspace">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <PortfolioView 
                portfolio={portfolio} 
                onNavigateTab={(tab) => setActiveTab(tab)}
                transactionsLog={transactionsLog}
              />
            </motion.div>
          )}

          {activeTab === 'stocks' && (
            <motion.div
              key="stocks"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <StockTab 
                stocks={stocks}
                portfolio={portfolio}
                onBuyStock={handleBuyStock}
                onSellStock={handleSellStock}
                selectedStockId={selectedStockId}
                setSelectedStockId={setSelectedStockId}
              />
            </motion.div>
          )}

          {activeTab === 'funds' && (
            <motion.div
              key="funds"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <MutualFundTab 
                funds={mockMutualFunds}
                portfolio={portfolio}
                onInvestFund={handleInvestFund}
                selectedFundId={selectedFundId}
                setSelectedFundId={setSelectedFundId}
              />
            </motion.div>
          )}

          {activeTab === 'wizard' && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <DecisionWizard 
                onCompleteProfile={setUserProfile}
                onExploreStock={handleExploreStock}
                onExploreFund={handleExploreFund}
              />
            </motion.div>
          )}

          {activeTab === 'calculators' && (
            <motion.div
              key="calculators"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Calculators onExploreFund={handleExploreFund} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Chat Coach Drawer Modal Overlay */}
      <WealthWiseAICoach 
        isOpen={isAiCoachOpen} 
        onClose={() => setIsAiCoachOpen(false)}
        userProfile={userProfile}
      />

      {/* Clean Aesthetic Footer */}
      <footer className="bg-white border-t border-slate-100 py-8" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="font-sans font-extrabold text-slate-700">wealthwise<span className="text-emerald-500">.ai</span></span>
            <span>© 2026 Virtual Wealth Compounding Academy.</span>
          </div>
          <div className="flex items-center space-x-4 mt-3 md:mt-0 font-bold text-slate-500">
            <a href="#rules" onClick={(e) => { e.preventDefault(); setActiveTab('calculators'); }} className="hover:text-emerald-500">SIP Formula</a>
            <span>•</span>
            <a href="#wizard" onClick={(e) => { e.preventDefault(); setActiveTab('wizard'); }} className="hover:text-emerald-500">Invest Pathfinder</a>
            <span>•</span>
            <a href="#coach" onClick={(e) => { e.preventDefault(); setIsAiCoachOpen(true); }} className="hover:text-emerald-500">AI Financial Advisor</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
