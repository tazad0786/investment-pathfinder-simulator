import React, { useState, useMemo } from 'react';
import { mockStocks, mockMutualFunds } from '../data/mockData';
import { UserProfile, Stock, MutualFund } from '../types';
import { 
  Compass, Shield, Landmark, Target, Sparkles, 
  ArrowRight, ArrowLeft, RefreshCw, CheckCircle, Percent, AlertTriangle 
} from 'lucide-react';

interface DecisionWizardProps {
  onCompleteProfile: (profile: UserProfile) => void;
  onExploreStock: (stock: Stock) => void;
  onExploreFund: (fund: MutualFund) => void;
}

export default function DecisionWizard({ onCompleteProfile, onExploreStock, onExploreFund }: DecisionWizardProps) {
  const [step, setStep] = useState<number>(1);
  
  // Quiz states
  const [experience, setExperience] = useState<'beginner' | 'moderate' | 'advanced' | ''>('');
  const [risk, setRisk] = useState<'Conservative' | 'Moderate' | 'Aggressive' | ''>('');
  const [goal, setGoal] = useState<'Retirement' | 'Wealth Creation' | 'Tax Saving' | 'Emergency Fund' | ''>('');
  const [budget, setBudget] = useState<number>(5000);
  const [horizon, setHorizon] = useState<number>(5);

  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false);

  // Total steps = 4
  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleAnalyze();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzed(true);
    onCompleteProfile({
      name: "Smart Investor",
      riskTolerance: risk || 'Moderate',
      goal: goal || 'Wealth Creation',
      horizon: horizon,
      monthlyInvestmentCapacity: budget,
      isCompleted: true
    });
  };

  const resetWizard = () => {
    setStep(1);
    setExperience('');
    setRisk('');
    setGoal('');
    setBudget(5000);
    setHorizon(5);
    setIsAnalyzed(false);
  };

  // Compute recommendation payload
  const analysisResult = useMemo(() => {
    if (!isAnalyzed) return null;

    let equityPercentage = 50;
    let debtPercentage = 30;
    let alternativePercentage = 20;
    let adviceTitle = "Moderate Wealth Compounding Profile";
    let adviceText = "Your profile suggests balanced asset compounding. We recommend a core foundation of Large-cap index mutual funds combined with low-beta blue chip stocks.";
    
    let matchedStocks: Stock[] = [];
    let matchedFunds: MutualFund[] = [];

    // 1. Core logic based on Goal and Risk
    if (risk === 'Conservative') {
      equityPercentage = 20;
      debtPercentage = 70;
      alternativePercentage = 10;
      adviceTitle = "Capital Preservation & Low Volatility";
      adviceText = "Preserving capital is your primary objective. Your profile suggests allocating mostly in low-risk Debt Liquid Mutual Funds and ultra-stable blue chip Dividend yielders to protect your hard-earned money.";
      
      // Conservative Stocks & Funds
      matchedStocks = mockStocks.filter(s => s.risk === 'Low' || s.dividendYield > 1.0);
      matchedFunds = mockMutualFunds.filter(f => f.category === 'Debt' || f.category === 'Index');
    } else if (risk === 'Aggressive') {
      equityPercentage = 80;
      debtPercentage = 10;
      alternativePercentage = 10;
      adviceTitle = "Aggressive Equity Compounding";
      adviceText = "You have an appetite for high growth and understand that short-term volatility yields massive compounding returns over the long term. We recommend Small Cap equity funds and high-growth consumer stocks.";
      
      matchedStocks = mockStocks.filter(s => s.risk === 'High');
      matchedFunds = mockMutualFunds.filter(f => f.category === 'Equity' && f.riskRating === 'High');
    } else {
      // Moderate
      equityPercentage = 50;
      debtPercentage = 35;
      alternativePercentage = 15;
      adviceTitle = "Balanced Portfolio Compounding";
      adviceText = "A diversified asset allocation ensures consistent growth while safeguarding against localized sector corrections. We suggest Flexi Cap equity combined with Large Cap indices.";

      matchedStocks = mockStocks.filter(s => s.sector === 'Information Technology' || s.sector === 'Financial Services' || s.risk === 'Low');
      matchedFunds = mockMutualFunds.filter(f => f.category === 'Index' || f.category === 'Hybrid' || f.subCategory === 'Flexi Cap');
    }

    // 2. Adjust for goals (ELSS Tax Saving takes priority for tax saver)
    if (goal === 'Tax Saving') {
      const elss = mockMutualFunds.filter(f => f.subCategory.includes('ELSS') || f.subCategory.includes('Tax'));
      if (elss.length > 0) {
        matchedFunds = [elss[0], ...matchedFunds.filter(f => !f.subCategory.includes('ELSS'))];
      }
      adviceTitle = "Tax Saving & Long-term Compounding";
      adviceText = "To maximize tax benefits under Section 80C, we prioritize Tax-Saving ELSS Mutual Funds which have a mandatory 3-year lock-in. This lock-in acts as a blessing by preventing impulse sell-offs.";
    } else if (goal === 'Emergency Fund') {
      equityPercentage = 10;
      debtPercentage = 90;
      alternativePercentage = 0;
      adviceTitle = "Liquid Emergency Safety Vault";
      adviceText = "Emergency money should never be locked in volatile stocks. We prioritize Debt Liquid Mutual funds that yield superior returns compared to traditional savings accounts while ensuring 24-hour liquidity.";
      matchedFunds = mockMutualFunds.filter(f => f.category === 'Debt');
      matchedStocks = []; // No individual stocks for emergencies
    }

    return {
      equity: equityPercentage,
      debt: debtPercentage,
      alternatives: alternativePercentage,
      title: adviceTitle,
      text: adviceText,
      stocks: matchedStocks.slice(0, 3),
      funds: matchedFunds.slice(0, 3)
    };
  }, [isAnalyzed, risk, goal, horizon]);

  return (
    <div className="space-y-8 py-2" id="wizard-container">
      {/* Pathfinder Intro Banner */}
      <div className="border-b border-slate-150 pb-5">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Compass className="h-5.5 w-5.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-2xl tracking-tight text-slate-900">
              InvestPath Finder™
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              An advanced, interactive step-by-step wizard to formulate your ideal investment thesis based on risk, tenure, and targets.
            </p>
          </div>
        </div>
      </div>

      {!isAnalyzed ? (
        <div className="max-w-3xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8" id="wizard-form-box">
          
          {/* Progress Timeline Indicator */}
          <div className="flex justify-between items-center mb-8" id="wizard-timeline">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center relative z-10">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                    step >= s 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10' 
                      : 'bg-slate-50 text-slate-400 border-slate-250'
                  }`}>
                    {s}
                  </div>
                  <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${
                    step === s ? 'text-slate-800' : 'text-slate-400'
                  }`}>
                    {s === 1 && 'Experience'}
                    {s === 2 && 'Risk Comfort'}
                    {s === 3 && 'Primary Goal'}
                    {s === 4 && 'Budget'}
                  </span>
                </div>
                {s < totalSteps && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                    step > s ? 'bg-slate-900' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Form Content Steps */}
          <div className="min-h-64 py-4" id="wizard-step-content">
            {/* STEP 1: Experience */}
            {step === 1 && (
              <div className="space-y-6" id="wizard-step-1">
                <div className="text-center space-y-1">
                  <h2 className="font-sans font-bold text-lg text-slate-800">What is your investing background?</h2>
                  <p className="text-xs text-slate-400">This helps us tailor the investment concepts and steps for you.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'beginner', title: 'Absolute Beginner', desc: 'I have never bought a stock or fund. I want guided safe steps.', icon: Shield },
                    { id: 'moderate', title: 'Moderate Investor', desc: 'I understand stock charts and basic mutual fund concepts.', icon: Compass },
                    { id: 'advanced', title: 'Experienced Trader', desc: 'I trade regularly, understand PE ratios, CAGR and want deep filters.', icon: Sparkles }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = experience === opt.id;
                    return (
                      <div
                        key={opt.id}
                        id={`wizard-opt-experience-${opt.id}`}
                        onClick={() => setExperience(opt.id as any)}
                        className={`cursor-pointer border p-5 rounded-2xl flex flex-col justify-between items-center text-center transition-all duration-200 hover:border-slate-400 ${
                          isSelected ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/5 scale-[1.01]' : 'border-slate-150 bg-white'
                        }`}
                      >
                        <div className={`p-3 rounded-full mb-4 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-sans font-bold text-sm text-slate-800">{opt.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Risk Comfort */}
            {step === 2 && (
              <div className="space-y-6" id="wizard-step-2">
                <div className="text-center space-y-1">
                  <h2 className="font-sans font-bold text-lg text-slate-800">What is your Risk Appetite?</h2>
                  <p className="text-xs text-slate-400">All investments carry risk. Choose the level you are comfortable with.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'Conservative', title: 'Conservative', desc: 'Protect capital first. Stable 5-8% returns. Low to negligible fluctuations.', icon: Landmark },
                    { id: 'Moderate', title: 'Balanced Moderate', desc: 'Balanced growth. Volatility is fine for robust 12-15% CAGR compounding.', icon: Compass },
                    { id: 'Aggressive', title: 'Aggressive Growth', desc: 'Hyper active growth. Okay with heavy drawdowns for potential >20% return CAGRs.', icon: Sparkles }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = risk === opt.id;
                    return (
                      <div
                        key={opt.id}
                        id={`wizard-opt-risk-${opt.id}`}
                        onClick={() => setRisk(opt.id as any)}
                        className={`cursor-pointer border p-5 rounded-2xl flex flex-col justify-between items-center text-center transition-all duration-200 hover:border-slate-400 ${
                          isSelected ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/5 scale-[1.01]' : 'border-slate-150 bg-white'
                        }`}
                      >
                        <div className={`p-3 rounded-full mb-4 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-sans font-bold text-sm text-slate-800">{opt.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Goals */}
            {step === 3 && (
              <div className="space-y-6" id="wizard-step-3">
                <div className="text-center space-y-1">
                  <h2 className="font-sans font-bold text-lg text-slate-800">What is your main Financial Goal?</h2>
                  <p className="text-xs text-slate-400">Goals help define which tax benefits or asset lock-ins are ideal for you.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { id: 'Tax Saving', title: 'Save Taxes', desc: 'Save tax under Section 80C using locked equity.', icon: Percent },
                    { id: 'Wealth Creation', title: 'Wealth Growth', desc: 'Compound savings over years for big targets.', icon: Sparkles },
                    { id: 'Retirement', title: 'Retirement Fund', desc: 'Build inflation-proof nest-egg for later.', icon: Target },
                    { id: 'Emergency Fund', title: 'Liquid Cash', desc: 'Highly secure safety vault accessible in hours.', icon: Shield }
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = goal === opt.id;
                    return (
                      <div
                        key={opt.id}
                        id={`wizard-opt-goal-${opt.id}`}
                        onClick={() => setGoal(opt.id as any)}
                        className={`cursor-pointer border p-4 rounded-xl flex flex-col justify-between items-center text-center transition-all duration-200 hover:border-slate-400 ${
                          isSelected ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/5 scale-[1.01]' : 'border-slate-150 bg-white'
                        }`}
                      >
                        <div className={`p-2.5 rounded-full mb-3 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-sans font-bold text-xs text-slate-800">{opt.title}</h3>
                          <p className="text-[11px] text-slate-500 leading-normal">{opt.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: Budget & Horizon */}
            {step === 4 && (
              <div className="space-y-8" id="wizard-step-4">
                <div className="text-center space-y-1">
                  <h2 className="font-sans font-bold text-lg text-slate-800">Budget & Compounding Tenure</h2>
                  <p className="text-xs text-slate-400">Specify your monthly capacity and investment time period.</p>
                </div>

                <div className="max-w-xl mx-auto space-y-6">
                  {/* Monthly Budget */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Contribution</span>
                      <span className="font-sans font-extrabold text-slate-800">₹{budget.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="50000"
                      step="500"
                      value={budget}
                      onChange={(e) => setBudget(+e.target.value)}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>₹500 / month</span>
                      <span>₹50,000 / month</span>
                    </div>
                  </div>

                  {/* Horizon Years */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tenure Horizon</span>
                      <span className="font-sans font-extrabold text-slate-800">{horizon} Years</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={horizon}
                      onChange={(e) => setHorizon(+e.target.value)}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1 Year</span>
                      <span>30 Years</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-6" id="wizard-action-row">
            <button
              onClick={prevStep}
              className={`cursor-pointer flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 ${
                step === 1 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              onClick={nextStep}
              disabled={
                (step === 1 && !experience) ||
                (step === 2 && !risk) ||
                (step === 3 && !goal)
              }
              className="cursor-pointer flex items-center space-x-2 text-xs font-bold px-5 py-2.5 rounded-lg bg-slate-900 text-white transition-all shadow-sm hover:bg-slate-850 hover:shadow disabled:opacity-50 disabled:pointer-events-none"
              id="wizard-btn-next"
            >
              <span>{step === totalSteps ? 'Formulate Allocation' : 'Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* PATHFINDER ANALYSIS REPORT SCREEN */
        <div className="space-y-8 animate-fade-in" id="pathfinder-analysis-report">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-slate-900/10">
            {/* Background elements */}
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"></div>
            
            <div className="space-y-3 z-10 max-w-xl">
              <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-400/20">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Pathfinder Matrix formulated</span>
              </span>
              <h2 className="font-sans font-black text-2xl tracking-tight leading-none text-white">
                {analysisResult?.title}
              </h2>
              <p className="text-xs leading-relaxed text-slate-300">
                {analysisResult?.text}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-white/5 backdrop-blur border border-white/10 rounded-2xl shrink-0 text-center z-10" id="allocation-breakdown">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Suggested Asset Mix</span>
              <div className="flex space-x-4 items-end">
                <div className="flex flex-col items-center">
                  <div className="w-10 bg-emerald-500 rounded-t-md transition-all duration-500" style={{ height: `${analysisResult?.equity || 10}px` }}></div>
                  <span className="text-xs font-black text-emerald-400 mt-1.5">{analysisResult?.equity}%</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">Equity</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 bg-indigo-500 rounded-t-md transition-all duration-500" style={{ height: `${analysisResult?.debt || 10}px` }}></div>
                  <span className="text-xs font-black text-indigo-400 mt-1.5">{analysisResult?.debt}%</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">Debt</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 bg-amber-400 rounded-t-md transition-all duration-500" style={{ height: `${analysisResult?.alternatives || 10}px` }}></div>
                  <span className="text-xs font-black text-amber-300 mt-1.5">{analysisResult?.alternatives}%</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">Cash/Gold</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* MUTUAL FUNDS SUGGESTIONS */}
            <div className="lg:col-span-6 space-y-4" id="suggested-mfs-pane">
              <h3 className="font-sans font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                <span>Mutual Funds to match your step</span>
              </h3>

              <div className="space-y-3">
                {analysisResult?.funds.map((fund) => (
                  <div 
                    key={fund.id}
                    onClick={() => onExploreFund(fund)}
                    className="group flex cursor-pointer items-center justify-between border border-slate-100 p-4 bg-white rounded-2xl hover:border-emerald-500 transition-all hover:shadow-sm"
                  >
                    <div className="space-y-1">
                      <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                        {fund.subCategory}
                      </span>
                      <h4 className="font-sans font-bold text-sm text-slate-800 group-hover:text-emerald-500 transition-colors">
                        {fund.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">Min SIP: ₹{fund.minSip} • Expense: {fund.expenseRatio}%</p>
                    </div>

                    <div className="text-right">
                      <span className="block text-[8px] font-semibold text-slate-400 uppercase">3Y Return</span>
                      <span className="text-sm font-extrabold text-emerald-500">{fund.cagr3y}% CAGR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STOCKS SUGGESTIONS */}
            <div className="lg:col-span-6 space-y-4" id="suggested-stocks-pane">
              <h3 className="font-sans font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Stocks to match your step</span>
              </h3>

              <div className="space-y-3">
                {analysisResult?.stocks.length === 0 ? (
                  <div className="border border-slate-100 p-6 bg-slate-50/50 rounded-2xl text-center space-y-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                    <h4 className="font-sans font-bold text-xs text-slate-700">No stocks match your goal</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Since your primary goal is safe liquid cash, individual stocks are not recommended because they contain core principal loss hazards.
                    </p>
                  </div>
                ) : (
                  analysisResult?.stocks.map((stock) => (
                    <div 
                      key={stock.id}
                      onClick={() => onExploreStock(stock)}
                      className="group flex cursor-pointer items-center justify-between border border-slate-100 p-4 bg-white rounded-2xl hover:border-emerald-500 transition-all hover:shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-extrabold text-slate-800 uppercase">
                            {stock.ticker}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">| {stock.sector}</span>
                        </div>
                        <h4 className="font-sans font-bold text-sm text-slate-700 group-hover:text-emerald-500 transition-colors">
                          {stock.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold">PE: {stock.peRatio} • Debt/Eq: {stock.debtToEquity}</p>
                      </div>

                      <div className="text-right">
                        <span className="block text-[8px] font-semibold text-slate-400 uppercase">Price</span>
                        <span className="text-sm font-extrabold text-slate-800">₹{stock.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={resetWizard}
              className="cursor-pointer flex items-center space-x-2 text-xs font-bold bg-slate-100 border border-slate-200 px-5 py-3 rounded-xl text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset & Pathfinder Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
