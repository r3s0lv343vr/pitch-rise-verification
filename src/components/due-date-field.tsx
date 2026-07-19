"use client";

import { useMemo, useState } from "react";
import { Label, Select } from "@/components/ui/form";

/**
 * Native <input type="date"> day segments often swallow the second digit when
 * typing (e.g. 28 → 02). Separate Day / Month / Year selects avoid that.
 */
export function DueDateField({
  id = "dueDate",
  name = "dueDate",
  label = "Due date",
  defaultValue,
}: {
  id?: string;
  name?: string;
  label?: string;
  defaultValue?: string | null;
}) {
  const initial = parseIsoDate(defaultValue);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => String(current - 1 + i));
  }, []);

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);

  const safeDay = day && Number(day) > daysInMonth ? String(daysInMonth).padStart(2, "0") : day;
  const iso =
    year && month && safeDay
      ? `${year}-${month.padStart(2, "0")}-${safeDay.padStart(2, "0")}`
      : "";

  return (
    <div>
      <Label htmlFor={`${id}-day`}>{label}</Label>
      <input type="hidden" id={id} name={name} value={iso} />
      <div className="grid grid-cols-3 gap-2">
        <Select
          id={`${id}-day`}
          aria-label="Day"
          value={safeDay}
          onChange={(e) => setDay(e.target.value)}
        >
          <option value="">DD</option>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const value = String(i + 1).padStart(2, "0");
            return (
              <option key={value} value={value}>
                {value}
              </option>
            );
          })}
        </Select>
        <Select
          id={`${id}-month`}
          aria-label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">MM</option>
          {Array.from({ length: 12 }, (_, i) => {
            const value = String(i + 1).padStart(2, "0");
            return (
              <option key={value} value={value}>
                {value}
              </option>
            );
          })}
        </Select>
        <Select
          id={`${id}-year`}
          aria-label="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">YYYY</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Day · Month · Year (full days 01–31)</p>
    </div>
  );
}

function parseIsoDate(value?: string | null) {
  if (!value) return { year: "", month: "", day: "" };
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}
