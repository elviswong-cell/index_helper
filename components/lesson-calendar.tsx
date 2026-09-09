"use client";

import { useState } from "react";
import { monthCells } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

/** Monday-first, matching how Hong Kong school timetables are read. */
const WEEKDAYS = {
  zh: ["一", "二", "三", "四", "五", "六", "日"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/**
 * One month grid with the course's dates circled. Days outside the month are
 * left blank rather than spilling into the neighbouring month, so the marked
 * dates line up under the right weekday.
 */
function MonthGrid({ year, month, marked }: { year: number; month: number; marked: Set<string> }) {
  const { lang } = useLang();
  const first = new Date(year, month, 1);
  const cells = monthCells(year, month);

  const title =
    lang === "zh"
      ? `${year}年${month + 1}月`
      : first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="w-[9.25rem] space-y-1">
      <p className="text-center text-[11px] font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS[lang].map((label, i) => (
          <span
            key={i}
            className="flex h-5 w-5 items-center justify-center text-[9px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} className="h-5 w-5" />;
          const isLessonDay = marked.has(new Date(year, month, day).toDateString());
          return (
            <span
              key={i}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums ${
                isLessonDay
                  ? "bg-[hsl(var(--warning))] font-semibold text-white"
                  : "text-muted-foreground"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Wraps a job card's date line and reveals a small calendar on hover, with
 * every date the course runs on circled in orange. Also opens on keyboard
 * focus and on tap, so it isn't hover-only.
 */
export function LessonCalendarHover({
  days,
  children,
}: {
  days: Date[];
  children: React.ReactNode;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  if (days.length === 0) return <>{children}</>;

  const marked = new Set(days.map((d) => d.toDateString()));
  // One grid per month the course touches, in order.
  const months = [...new Map(days.map((d) => [monthKeyOf(d), d])).values()];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-label={t("show_course_calendar")}
    >
      <span className="underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
        {children}
      </span>
      {/* w-max lays the months out side by side; the cap only wraps them
          when a course spans more months than fit on one row. */}
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 flex w-max max-w-[min(92vw,32rem)] flex-wrap gap-3 rounded-2xl border border-border bg-white p-3 shadow-lg"
        >
          {months.map((m) => (
            <MonthGrid
              key={monthKeyOf(m)}
              year={m.getFullYear()}
              month={m.getMonth()}
              marked={marked}
            />
          ))}
          <span className="w-full text-center text-[10px] text-muted-foreground">
            {days.length} {t("course_days_suffix")}
          </span>
        </span>
      )}
    </span>
  );
}
