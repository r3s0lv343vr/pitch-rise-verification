"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUserOption } from "@/lib/skills";

type Person = {
  id: string;
  name: string;
  username: string;
  skills?: string | null;
};

/**
 * Checkbox roster for adding/removing task teammates.
 * Native <select multiple> is easy to miss (Ctrl/Cmd) and fails often on trackpads.
 */
export function TeamMemberPicker({
  users,
  name = "memberIds",
  excludeIds = [],
  defaultSelectedIds = [],
  label = "Team members",
}: {
  users: Person[];
  name?: string;
  excludeIds?: string[];
  defaultSelectedIds?: string[];
  label?: string;
}) {
  const exclude = useMemo(() => new Set(excludeIds.filter(Boolean)), [excludeIds]);
  const visible = useMemo(() => users.filter((u) => !exclude.has(u.id)), [users, exclude]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds.filter((id) => !exclude.has(id)))
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => !exclude.has(id)));
      return next;
    });
  }, [exclude]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((u) => {
      const hay = `${u.name} ${u.username} ${u.skills || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [visible, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-[11px] text-slate-500">{selected.size} selected</div>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or skill…"
        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
      />
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-cyan-400/25 bg-slate-950/70 p-2">
        {filtered.map((u) => {
          const checked = selected.has(u.id);
          return (
            <label
              key={u.id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                checked ? "bg-cyan-500/15 text-cyan-50" : "text-slate-200 hover:bg-slate-800/70"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={() => toggle(u.id)}
              />
              <span>{formatUserOption(u)}</span>
              {/* Only checked boxes submit — unchecked = removed on save */}
              {checked ? <input type="hidden" name={name} value={u.id} /> : null}
            </label>
          );
        })}
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-500">No matching people.</p>
        ) : null}
      </div>
      <p className="text-[11px] text-slate-500">
        Check to add, uncheck to remove, then save. Skills stay visible for faster staffing.
      </p>
    </div>
  );
}
