"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Command Center", match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") },
  { href: "/projects", label: "Projects", match: (p: string) => p === "/projects" || p.startsWith("/projects/") },
  { href: "/my-work", label: "My Work", match: (p: string) => p.startsWith("/my-work") },
  { href: "/reports", label: "Reports", match: (p: string) => p.startsWith("/reports") },
];

/**
 * Always-visible navigation so users are never trapped behind the hamburger drawer.
 */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex w-full gap-1 overflow-x-auto border-b border-slate-800/80 bg-slate-950/70 px-3 py-2 sm:px-4"
    >
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm",
              active
                ? "bg-cyan-500/20 text-cyan-100"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
