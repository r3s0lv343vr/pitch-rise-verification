"use client";

import { useState, useTransition } from "react";
import { deleteTaskAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function DeleteTaskButton({
  taskId,
  projectId,
  taskTitle,
}: {
  taskId: string;
  projectId: string;
  taskTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-0 flex-col items-end gap-2">
      {!confirming ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          Delete task
        </Button>
      ) : (
        <div className="w-full min-w-[16rem] max-w-sm rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-left sm:min-w-[18rem]">
          <p className="text-sm font-medium text-rose-50">Are you sure?</p>
          <p className="mt-1 text-xs text-rose-100/85">
            Delete &ldquo;{taskTitle}&rdquo; from the Task List? This cannot be undone.
          </p>
          {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                setError(null);
                const formData = new FormData();
                formData.set("taskId", taskId);
                formData.set("projectId", projectId);
                startTransition(async () => {
                  const result = await deleteTaskAction(formData);
                  if (result && !result.ok) {
                    setError(result.error || "Could not delete task.");
                  }
                });
              }}
            >
              {pending ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => {
                setError(null);
                setConfirming(false);
              }}
            >
              No
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
