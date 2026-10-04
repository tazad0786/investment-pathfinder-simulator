import { createContext, useContext } from 'react';
import { TabId } from './types';

export interface NavValue {
  tab: TabId;
  setTab: (tab: TabId) => void;
  stockId: string | null;
  fundId: string | null;
  fnoSymbol: string | null;
  openStock: (id: string | null) => void;
  openFund: (id: string | null) => void;
  openFno: (symbol: string) => void;
  openCoach: () => void;
}

export const NavContext = createContext<NavValue | null>(null);

export function useNav(): NavValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavContext');
  return ctx;
}
