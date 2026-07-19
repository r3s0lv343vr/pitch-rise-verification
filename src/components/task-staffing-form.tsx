"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateTaskStaffingAction } from "@/app/actions";
import { TeamMemberPicker } from "@/components/team-member-picker";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form";
import { formatUserOption } from "@/lib/skills";

type Person = {
  id: string;
  name: string;
  username: string;
  skills?: string | null;
};

export function TaskStaffingForm({
  taskId,
  projectId,
  initialLeaderId,
  initialMemberIds,
  users,
  highlightSaved = false,
}: {
  taskId: string;
  projectId: string;
  initialLeaderId: string | null;
  initialMemberIds: string[];
  users: Person[];
  highlightSaved?: boolean;
}) {
  const [leaderId, setLeaderId] = useState(initialLeaderId ?? "");
  const [message, setMessage] = useState<string | null>(
    highlightSaved ? "Saved — leader and team members are lodged on this task." : null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (highlightSaved && boxRef.current) {
      boxRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSaved]);

  const excludeIds = useMemo(() => (leaderId ? [leaderId] : []), [leaderId]);

  function onSubmit(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateTaskStaffingAction(formData);
      if (result?.ok) {
        setMessage(
          `Saved — leader ${result.leaderLabel} · ${result.memberCount} team member${
            result.memberCount === 1 ? "" : "s"
          } lodged.`
        );
      } else {
        setError(result?.error || "Could not save staffing. Please try again.");
      }
    });
  }

  return (
    <form
      id={`task-staffing-${taskId}`}
      ref={boxRef}
      action={onSubmit}
      className="space-y-3 rounded-xl border border-cyan-400/25 bg-slate-950/50 p-3"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />

      {message ? (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100">
          ✓ {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-400/50 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div>
        <Label htmlFor={`leader-${taskId}`}>Task leader</Label>
        <Select
          id={`leader-${taskId}`}
          name="leaderId"
          value={leaderId}
          onChange={(e) => setLeaderId(e.target.value)}
        >
          <option value="">No task leader</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {formatUserOption(u)}
            </option>
          ))}
        </Select>
      </div>

      <TeamMemberPicker
        key={`members-${taskId}-${leaderId}`}
        users={users}
        excludeIds={excludeIds}
        defaultSelectedIds={initialMemberIds}
        label="Team members — add or remove anytime"
      />

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save leader & team"}
      </Button>
    </form>
  );
}
