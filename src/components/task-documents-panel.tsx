"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { deleteTaskDocumentAction, uploadTaskDocumentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import {
  documentCategoryLabel,
  formatFileSize,
  TASK_DOCUMENT_CATEGORIES,
  TASK_DOCUMENT_MAX_BYTES,
  validateTaskDocumentFile,
} from "@/lib/task-documents";

type Doc = {
  id: string;
  fileName: string;
  category: string;
  sizeBytes: number;
  url: string;
  note: string;
  createdAt: string | Date;
  uploader: { name: string };
};

export function TaskDocumentsPanel({
  taskId,
  documents,
  canUpload,
}: {
  taskId: string;
  documents: Doc[];
  canUpload: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("minutes");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [documents]
  );

  function onUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    const file = formData.get("file");
    const validation = validateTaskDocumentFile(file instanceof File ? file : null);
    if (validation) {
      setError(validation);
      return;
    }
    startTransition(async () => {
      const result = await uploadTaskDocumentAction(formData);
      if (result?.ok) {
        setMessage(`Uploaded ${result.fileName}`);
        setNote("");
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setError(result?.error || "Upload failed.");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-slate-950/40 p-3">
      <div>
        <div className="text-sm font-medium text-white">Task documents</div>
        <p className="mt-0.5 text-xs text-slate-400">
          Upload meeting minutes, plans, or other reference files (max 25MB each).
        </p>
      </div>

      {sorted.length ? (
        <ul className="space-y-2">
          {sorted.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-200 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.fileName}</span>
                </a>
                <div className="mt-1 text-[11px] text-slate-400">
                  {documentCategoryLabel(doc.category)} · {formatFileSize(doc.sizeBytes)} ·{" "}
                  {doc.uploader.name}
                  {doc.note ? ` · ${doc.note}` : ""}
                </div>
              </div>
              {canUpload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-rose-200 hover:text-rose-100"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    const fd = new FormData();
                    fd.set("documentId", doc.id);
                    startTransition(async () => {
                      const result = await deleteTaskDocumentAction(fd);
                      if (result && !result.ok) {
                        setError(result.error || "Could not delete document.");
                      } else {
                        setMessage("Document removed.");
                      }
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No documents attached yet.</p>
      )}

      {canUpload ? (
        <form action={onUpload} className="space-y-2 border-t border-slate-800 pt-3">
          <input type="hidden" name="taskId" value={taskId} />
          <div>
            <Label htmlFor={`doc-category-${taskId}`}>Document type</Label>
            <Select
              id={`doc-category-${taskId}`}
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {TASK_DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`doc-note-${taskId}`}>Note (optional)</Label>
            <Input
              id={`doc-note-${taskId}`}
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Stakeholder sync 19 Jul"
            />
          </div>
          <div>
            <Label htmlFor={`doc-file-${taskId}`}>File (max 25MB)</Label>
            <input
              ref={inputRef}
              id={`doc-file-${taskId}`}
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,image/*"
              required
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-cyan-100 hover:file:bg-cyan-500/30"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFileName(f?.name ?? null);
                setError(f ? validateTaskDocumentFile(f) : null);
              }}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {fileName
                ? `Selected: ${fileName}`
                : `PDF, Office, images, text/CSV · up to ${formatFileSize(TASK_DOCUMENT_MAX_BYTES)}`}
            </p>
          </div>
          {error ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-100">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-100">
              ✓ {message}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={pending || !!error}>
            <Upload className="h-3.5 w-3.5" />
            {pending ? "Uploading…" : "Upload document"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
