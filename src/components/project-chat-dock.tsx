"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, Search, Send, X } from "lucide-react";
import {
  getProjectChatMetaAction,
  listProjectMessagesAction,
  sendProjectMessageAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; username: string; role: Role };
};

function readProjectId(pathname: string, searchProject: string | null) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (match?.[1]) return match[1];
  if ((pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && searchProject) {
    return searchProject;
  }
  return null;
}

function lastReadKey(projectId: string, userId: string) {
  return `pm-chat-last-read:${userId}:${projectId}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectChatDock({
  user,
}: {
  user: { id: string; name: string; role: Role };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = readProjectId(pathname, searchParams.get("project"));

  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [pending, startTransition] = useTransition();
  const [highlightBefore, setHighlightBefore] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!projectId) return;
      const result = await listProjectMessagesAction({
        projectId,
        q: query.trim() || undefined,
        limit: 120,
      });
      if (!result.ok) {
        if (!opts?.quiet) setError(result.error || "Could not load chat.");
        return;
      }
      setProjectName(result.projectName);
      setMessages(result.messages);

      const lastReadRaw = window.localStorage.getItem(lastReadKey(projectId, user.id));
      const lastRead = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
      const incoming = result.messages.filter(
        (m) => m.author.id !== user.id && new Date(m.createdAt).getTime() > lastRead
      );
      setHasUnread(incoming.length > 0 && !open);
    },
    [projectId, query, user.id, open]
  );

  useEffect(() => {
    setMessages([]);
    setProjectName(null);
    setQuery("");
    setDraft("");
    setError(null);
    setHasUnread(false);
    if (!projectId) {
      setOpen(false);
      return;
    }
    void loadMessages({ quiet: true });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!projectId) return;
    const t = window.setInterval(() => {
      void (async () => {
        const meta = await getProjectChatMetaAction(projectId);
        if (!meta.ok) return;
        if (meta.projectName) setProjectName(meta.projectName);
        const lastReadRaw = window.localStorage.getItem(lastReadKey(projectId, user.id));
        const lastRead = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;
        const latest = meta.latestAt ? new Date(meta.latestAt).getTime() : 0;
        if (latest > lastRead) {
          if (open) {
            await loadMessages({ quiet: true });
          } else {
            setHasUnread(true);
          }
        } else if (open) {
          await loadMessages({ quiet: true });
        }
      })();
    }, 6000);
    return () => window.clearInterval(t);
  }, [projectId, open, user.id, loadMessages]);

  useEffect(() => {
    if (!open || !projectId) return;
    const lastReadRaw = window.localStorage.getItem(lastReadKey(projectId, user.id));
    setHighlightBefore(lastReadRaw ? new Date(lastReadRaw).getTime() : 0);
    void loadMessages({ quiet: true });
    window.localStorage.setItem(lastReadKey(projectId, user.id), new Date().toISOString());
    setHasUnread(false);
  }, [open, projectId, user.id, loadMessages]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  if (!projectId) return null;

  function onSend() {
    if (!projectId || !draft.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("body", draft.trim());
    startTransition(async () => {
      const result = await sendProjectMessageAction(formData);
      if (!result.ok) {
        setError(result.error || "Could not send message.");
        return;
      }
      setDraft("");
      setMessages((prev) => [...prev, result.message]);
      window.localStorage.setItem(lastReadKey(projectId, user.id), new Date().toISOString());
      setHasUnread(false);
    });
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-5 right-5 z-[75] inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl transition",
          hasUnread
            ? "bg-rose-600 text-white ring-2 ring-rose-300 animate-pulse"
            : "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
          open && "hidden"
        )}
        aria-label="Open project chat"
      >
        <MessageCircle className="h-4 w-4" />
        Project chat
        {hasUnread ? (
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
            NEW
          </span>
        ) : null}
      </button>

      {/* Right conversation pane */}
      {open ? (
        <aside className="fixed inset-y-0 right-0 z-[80] flex w-[min(100vw,380px)] flex-col border-l border-slate-700 bg-slate-950 shadow-2xl">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                Project chat
              </div>
              <div className="truncate text-sm font-semibold text-white">
                {projectName || "Loading…"}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Open to all roles · this project only
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-800 px-3 py-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void loadMessages();
                }}
                placeholder="Search messages…"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => void loadMessages()}
                className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Find
              </button>
            </label>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="px-1 text-sm text-slate-500">
                {query
                  ? "No messages match your search."
                  : "No messages yet. Start the conversation for this project."}
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.author.id === user.id;
                const isIncomingNew =
                  !mine && new Date(m.createdAt).getTime() > highlightBefore;
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow",
                        mine
                          ? "bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/30"
                          : isIncomingNew
                            ? "bg-rose-600/25 text-rose-50 ring-2 ring-rose-500/70"
                            : "bg-slate-900 text-slate-100 ring-1 ring-slate-700"
                      )}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-white">{m.author.name}</span>
                        <span className="uppercase tracking-wide text-slate-400">
                          {roleLabel(m.author.role)}
                        </span>
                        <span className="text-slate-500">{formatTime(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800 p-3">
            {error ? <p className="mb-2 text-xs text-rose-300">{error}</p> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Message the project team…"
                className="min-h-[64px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={pending || !draft.trim()}
                onClick={onSend}
                className="shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                {pending ? "…" : "Send"}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Enter to send · Shift+Enter for new line · chat resets per project
            </p>
          </div>
        </aside>
      ) : null}
    </>
  );
}
