"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isWalkthroughActive,
  readWalkthroughState,
  writeWalkthroughState,
  type WalkthroughState,
  type WalkthroughStep,
} from "@/lib/walkthrough";

type WalkthroughContextValue = {
  state: WalkthroughState;
  active: boolean;
  setStep: (step: WalkthroughStep, extras?: Partial<WalkthroughState>) => void;
  complete: () => void;
  skip: () => void;
  restart: () => void;
  menuOpenRequest: number;
  requestOpenMenu: () => void;
};

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalkthroughState>(() => readWalkthroughState());
  const [menuOpenRequest, setMenuOpenRequest] = useState(0);

  useEffect(() => {
    setState(readWalkthroughState());
    function onStorage(e: StorageEvent) {
      if (e.key === "pm-beginner-walkthrough-v1") setState(readWalkthroughState());
    }
    function onCustom() {
      setState(readWalkthroughState());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pm-walkthrough-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pm-walkthrough-change", onCustom as EventListener);
    };
  }, []);

  const persist = useCallback((next: WalkthroughState) => {
    setState(next);
    writeWalkthroughState(next);
  }, []);

  const setStep = useCallback(
    (step: WalkthroughStep, extras?: Partial<WalkthroughState>) => {
      persist({
        ...readWalkthroughState(),
        status: "active",
        step,
        ...extras,
      });
    },
    [persist]
  );

  const complete = useCallback(() => {
    persist({ status: "completed", step: "done", highlightProjectId: null });
  }, [persist]);

  const skip = useCallback(() => {
    persist({ status: "skipped", step: "done", highlightProjectId: null });
  }, [persist]);

  const restart = useCallback(() => {
    persist({ status: "active", step: "projects-nav", highlightProjectId: null });
    setMenuOpenRequest((n) => n + 1);
  }, [persist]);

  const requestOpenMenu = useCallback(() => {
    setMenuOpenRequest((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      state,
      active: isWalkthroughActive(state),
      setStep,
      complete,
      skip,
      restart,
      menuOpenRequest,
      requestOpenMenu,
    }),
    [state, setStep, complete, skip, restart, menuOpenRequest, requestOpenMenu]
  );

  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) {
    throw new Error("useWalkthrough must be used within WalkthroughProvider");
  }
  return ctx;
}
