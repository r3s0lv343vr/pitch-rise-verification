"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Rect = { top: number; left: number; width: number; height: number };

function measure(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}

/**
 * Non-blocking highlight ring. Intentionally does NOT use a full-screen dim overlay
 * (those can trap clicks and block the hamburger / project tabs).
 */
export function TourSpotlight({
  targetSelector,
  vibrate = false,
  padding = 6,
}: {
  targetSelector: string | null;
  vibrate?: boolean;
  padding?: number;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }

    let alive = true;
    function update() {
      if (!alive || !targetSelector) return;
      const el = document.querySelector(targetSelector);
      setRect(measure(el));
    }

    update();
    const interval = window.setInterval(update, 400);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetSelector]);

  useEffect(() => {
    if (!targetSelector) return;
    const el = document.querySelector(targetSelector);
    if (!(el instanceof HTMLElement)) return;
    el.classList.add("tour-target-active");
    if (vibrate) el.classList.add("tour-vibrate");
    return () => {
      el.classList.remove("tour-target-active", "tour-vibrate");
    };
  }, [targetSelector, vibrate, rect?.top, rect?.left, rect?.width, rect?.height]);

  if (!mounted || !rect || !targetSelector) return null;

  return createPortal(
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed z-[45] rounded-2xl border-2 border-cyan-300/90 bg-cyan-400/10",
        vibrate && "tour-vibrate"
      )}
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        boxShadow: "0 0 0 3px rgba(103,232,249,0.35), 0 0 28px rgba(34,211,238,0.35)",
      }}
    />,
    document.body
  );
}
