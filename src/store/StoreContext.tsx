import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Action, reducer, validateAction } from './reducer';
import { AppState, loadState, serializeState, STORAGE_KEY } from './state';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface StoreValue {
  state: AppState;
  /** Validates and dispatches. Shows an error toast and returns false when invalid. */
  act: (action: Action, successMessage?: string) => boolean;
  notify: (message: string, kind?: ToastKind) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  liveTicking: boolean;
  setLiveTicking: (v: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const TICK_MS = 3000;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [liveTicking, setLiveTicking] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastId = useRef(0);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  const act = useCallback(
    (action: Action, successMessage?: string) => {
      const error = validateAction(stateRef.current, action);
      if (error) {
        notify(error, 'error');
        return false;
      }
      dispatch(action);
      if (successMessage) notify(successMessage, 'success');
      return true;
    },
    [notify],
  );

  useEffect(() => {
    if (!liveTicking) return;
    const id = setInterval(() => dispatch({ type: 'TICK', seed: Math.floor(Math.random() * 2 ** 32) }), TICK_MS);
    return () => clearInterval(id);
  }, [liveTicking]);

  // Persist at most every 2 seconds
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeState(state));
      } catch {
        /* storage full or unavailable */
      }
    }, 2000);
    return () => clearTimeout(id);
  }, [state]);

  const value = useMemo(
    () => ({ state, act, notify, toasts, dismissToast, liveTicking, setLiveTicking }),
    [state, act, notify, toasts, dismissToast, liveTicking],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
