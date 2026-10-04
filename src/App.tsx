import { ComponentType, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import WealthWiseAICoach from './components/WealthWiseAICoach';
import { Disclaimer, Toaster } from './components/common/ui';
import { StoreProvider, useStore } from './store/StoreContext';
import { NavContext, NavValue } from './nav';
import { TabId } from './types';

const HomeTab = lazy(() => import('./components/HomeTab'));
const StocksTab = lazy(() => import('./components/StocksTab'));
const FundsTab = lazy(() => import('./components/FundsTab'));
const FnoTab = lazy(() => import('./components/FnoTab'));
const BondsTab = lazy(() => import('./components/BondsTab'));
const IpoTab = lazy(() => import('./components/IpoTab'));
const PortfolioTab = lazy(() => import('./components/PortfolioTab'));
const PlannerTab = lazy(() => import('./components/PlannerTab'));
const CalculatorsTab = lazy(() => import('./components/CalculatorsTab'));

const TAB_COMPONENTS: Record<TabId, ComponentType> = {
  home: HomeTab,
  stocks: StocksTab,
  funds: FundsTab,
  fno: FnoTab,
  bonds: BondsTab,
  ipo: IpoTab,
  portfolio: PortfolioTab,
  planner: PlannerTab,
  calculators: CalculatorsTab,
};

function Shell() {
  const { state } = useStore();
  const [tab, setTabState] = useState<TabId>('home');
  const [stockId, setStockId] = useState<string | null>(null);
  const [fundId, setFundId] = useState<string | null>(null);
  const [fnoSymbol, setFnoSymbol] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, stockId, fundId]);

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    if (t === 'stocks') setStockId(null);
    if (t === 'funds') setFundId(null);
  }, []);

  const nav = useMemo<NavValue>(
    () => ({
      tab,
      setTab,
      stockId,
      fundId,
      fnoSymbol,
      openStock: (id) => {
        setStockId(id);
        setTabState('stocks');
      },
      openFund: (id) => {
        setFundId(id);
        setTabState('funds');
      },
      openFno: (symbol) => {
        setFnoSymbol(symbol);
        setTabState('fno');
      },
      openCoach: () => setCoachOpen(true),
    }),
    [tab, setTab, stockId, fundId, fnoSymbol],
  );

  const Active = TAB_COMPONENTS[tab];

  return (
    <NavContext.Provider value={nav}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="wealthwise-app-root">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6" id="primary-workspace">
          <Suspense fallback={<div className="py-24 text-center text-sm text-slate-400">Loading…</div>}>
            <Active />
          </Suspense>
        </main>
        <WealthWiseAICoach isOpen={coachOpen} onClose={() => setCoachOpen(false)} userProfile={state.userProfile} />
        <Toaster />
        <footer className="bg-white border-t border-slate-100 py-6" id="app-footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-2">
            <div className="flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <span>
                <span className="font-extrabold text-slate-700">
                  wealthwise<span className="text-emerald-500">.ai</span>
                </span>{' '}
                — virtual investing academy
              </span>
              <div className="flex gap-4 font-semibold text-slate-500">
                <button onClick={() => setTab('calculators')} className="hover:text-emerald-600">Calculators</button>
                <button onClick={() => setTab('planner')} className="hover:text-emerald-600">Goal planner</button>
                <button onClick={() => setCoachOpen(true)} className="hover:text-emerald-600">AI coach</button>
              </div>
            </div>
            <Disclaimer className="text-center md:text-left" />
          </div>
        </footer>
      </div>
    </NavContext.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
