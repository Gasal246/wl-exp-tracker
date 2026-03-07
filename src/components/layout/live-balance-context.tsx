"use client";

import { createContext, useContext } from "react";

type LiveBalanceContextValue = {
  currency: string | null;
  setBalance: (value: number) => void;
  applyDelta: (delta: number) => void;
};

export const LiveBalanceContext = createContext<LiveBalanceContextValue | null>(null);

export function useLiveBalance() {
  return useContext(LiveBalanceContext);
}
