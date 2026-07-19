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

export function TourSpotlight({
  targetSelector,
  vibrate = false,
  padding = 8,
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
    const el = document.querySelector(targetSelector);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    const interval = window.setInterval(update, 350);
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
        "pointer-events-none fixed z-[60] rounded-2xl border-2 border-cyan-300/90 bg-cyan-400/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.62)]",
        vibrate && "tour-vibrate"
      )}
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
    />,
    document.body
  );
}
