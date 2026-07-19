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
  WALKTHROUGH_DEFAULT,
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
  // Important: same default on server + first client paint to avoid hydration mismatch
  // (mismatches break Next.js client navigation / click handlers).
  const [state, setState] = useState<WalkthroughState>(WALKTHROUGH_DEFAULT);
  const [menuOpenRequest, setMenuOpenRequest] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem("pm-beginner-walkthrough-v1");
    } catch {
      // ignore
    }
    setState(readWalkthroughState());
    setReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key === "pm-beginner-walkthrough-v2") setState(readWalkthroughState());
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
  }, [persist]);

  const requestOpenMenu = useCallback(() => {
    setMenuOpenRequest((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      state,
      // Until mounted, treat as inactive so SSR/CSR match.
      active: ready && isWalkthroughActive(state),
      setStep,
      complete,
      skip,
      restart,
      menuOpenRequest,
      requestOpenMenu,
    }),
    [state, ready, setStep, complete, skip, restart, menuOpenRequest, requestOpenMenu]
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
