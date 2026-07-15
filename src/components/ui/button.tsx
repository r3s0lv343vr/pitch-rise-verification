import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50",
        variant === "primary" && "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
        variant === "secondary" && "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
        variant === "ghost" && "bg-transparent text-slate-300 hover:bg-slate-800/80",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-5 py-3 text-base",
        className
      )}
      {...props}
    />
  );
}
