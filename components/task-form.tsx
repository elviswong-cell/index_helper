"use client";

import { useState } from "react";
import { CopyPlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Lesson, RateUnit } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export interface LessonInput {
  /** Stable id — reused on edit so existing applications keep pointing at the right lesson. */
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface TaskFormValues {
  schoolName: string;
  address: string;
  mapUrl: string;
  lessons: LessonInput[];
  mt: number;
  ta: number;
  mtRate: number;
  taRate: number;
  rateUnit: RateUnit;
  deadlineDate: string;
  deadlineTime: string;
  meetUrl: string;
  meetDate: string;
  meetTime: string;
  notes: string;
}

/**
 * Generated in event handlers only (never during render), so server and
 * client markup always agree.
 */
export function newLessonId(): string {
  return `lesson-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const emptyLesson: LessonInput = {
  id: "lesson-1",
  title: "",
  date: "",
  startTime: "",
  endTime: "",
};

export const emptyTaskForm: TaskFormValues = {
  schoolName: "",
  address: "",
  mapUrl: "",
  lessons: [emptyLesson],
  mt: 1,
  ta: 1,
  mtRate: 200,
  taRate: 150,
  rateUnit: "hourly",
  deadlineDate: "",
  deadlineTime: "",
  meetUrl: "",
  meetDate: "",
  meetTime: "",
  notes: "",
};

/**
 * Turn the form's lesson rows into the shape stored on the task, sorted by
 * start time. `startAt`/`endAt` span the whole course so list ordering and
 * older UI keep working.
 */
export function lessonsFromForm(values: TaskFormValues): {
  lessons: Lesson[];
  startAt: Date;
  endAt: Date;
} {
  const lessons = values.lessons
    .map((l) => ({
      id: l.id,
      startAt: new Date(`${l.date}T${l.startTime}:00`),
      endAt: new Date(`${l.date}T${l.endTime}:00`),
      ...(l.title.trim() ? { title: l.title.trim() } : {}),
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return {
    lessons,
    startAt: lessons[0].startAt,
    endAt: lessons[lessons.length - 1].endAt,
  };
}

export function TaskForm({
  initial,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: {
  initial: TaskFormValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [values, setValues] = useState<TaskFormValues>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setLesson<K extends keyof LessonInput>(
    index: number,
    key: K,
    value: LessonInput[K],
  ) {
    setValues((v) => ({
      ...v,
      lessons: v.lessons.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    }));
  }

  function addLesson() {
    setValues((v) => {
      const last = v.lessons[v.lessons.length - 1];
      return {
        ...v,
        lessons: [
          ...v.lessons,
          {
            id: newLessonId(),
            title: "",
            date: "",
            // Same hours as the previous lesson — most courses repeat weekly.
            startTime: last?.startTime ?? "",
            endTime: last?.endTime ?? "",
          },
        ],
      };
    });
  }

  /** Copy the last lesson and bump it a week — the common weekly-course case. */
  function addNextWeek() {
    setValues((v) => {
      const last = v.lessons[v.lessons.length - 1];
      let date = "";
      if (last?.date) {
        const d = new Date(`${last.date}T00:00:00`);
        d.setDate(d.getDate() + 7);
        date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;
      }
      return {
        ...v,
        lessons: [
          ...v.lessons,
          {
            id: newLessonId(),
            title: "",
            date,
            startTime: last?.startTime ?? "",
            endTime: last?.endTime ?? "",
          },
        ],
      };
    });
  }

  function removeLesson(index: number) {
    setValues((v) =>
      v.lessons.length <= 1
        ? v
        : { ...v, lessons: v.lessons.filter((_, i) => i !== index) },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (values.lessons.length === 0) {
      setError(t("form_error_no_lesson"));
      return;
    }
    for (const [i, lesson] of values.lessons.entries()) {
      if (!lesson.date || !lesson.startTime || !lesson.endTime) {
        setError(`${t("form_lesson")} ${i + 1}: ${t("form_error_datetime")}`);
        return;
      }
      const start = new Date(`${lesson.date}T${lesson.startTime}:00`);
      const end = new Date(`${lesson.date}T${lesson.endTime}:00`);
      if (end <= start) {
        setError(`${t("form_lesson")} ${i + 1}: ${t("form_error_end_after_start")}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="schoolName">{t("form_school_name")}</Label>
        <Input
          id="schoolName"
          placeholder={t("form_school_placeholder")}
          value={values.schoolName}
          onChange={(e) => set("schoolName", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("form_address")}</Label>
        <Input
          id="address"
          placeholder={t("form_address_placeholder")}
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mapUrl">{t("form_map_url")}</Label>
        <Input
          id="mapUrl"
          type="url"
          placeholder="https://maps.app.goo.gl/..."
          value={values.mapUrl}
          onChange={(e) => set("mapUrl", e.target.value)}
        />
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <Label>{t("form_lessons")}</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t("form_lessons_hint")}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {values.lessons.length} {t("lessons_count_suffix")}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-white/60 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium w-10">#</th>
                <th className="px-3 py-2 text-left font-medium">{t("form_date")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("form_start_time")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("form_end_time")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("form_lesson_title")}</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {values.lessons.map((lesson, i) => (
                <tr key={lesson.id} className="border-t border-border/70">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="date"
                      value={lesson.date}
                      onChange={(e) => setLesson(i, "date", e.target.value)}
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      value={lesson.startTime}
                      onChange={(e) => setLesson(i, "startTime", e.target.value)}
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="time"
                      value={lesson.endTime}
                      onChange={(e) => setLesson(i, "endTime", e.target.value)}
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder={t("form_lesson_title_placeholder")}
                      value={lesson.title}
                      onChange={(e) => setLesson(i, "title", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLesson(i)}
                      disabled={values.lessons.length <= 1}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t("form_remove_lesson")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addLesson} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("form_add_lesson")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addNextWeek}
            className="gap-2"
          >
            <CopyPlus className="h-4 w-4" />
            {t("form_add_next_week")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("form_rate_unit")}</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("rateUnit", "hourly")}
            className={`press flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              values.rateUnit === "hourly"
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-white/50 text-muted-foreground"
            }`}
          >
            {t("form_rate_hourly")}
          </button>
          <button
            type="button"
            onClick={() => set("rateUnit", "daily")}
            className={`press flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              values.rateUnit === "daily"
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-white/50 text-muted-foreground"
            }`}
          >
            {t("form_rate_daily")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mt">{t("form_mt_slots")}</Label>
            <Input
              id="mt"
              type="number"
              min={0}
              value={values.mt}
              onChange={(e) => set("mt", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mtRate">
              {t(values.rateUnit === "hourly" ? "form_mt_rate_hourly" : "form_mt_rate_daily")}
            </Label>
            <Input
              id="mtRate"
              type="number"
              min={0}
              step={10}
              value={values.mtRate}
              onChange={(e) => set("mtRate", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ta">{t("form_ta_slots")}</Label>
            <Input
              id="ta"
              type="number"
              min={0}
              value={values.ta}
              onChange={(e) => set("ta", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taRate">
              {t(values.rateUnit === "hourly" ? "form_ta_rate_hourly" : "form_ta_rate_daily")}
            </Label>
            <Input
              id="taRate"
              type="number"
              min={0}
              step={10}
              value={values.taRate}
              onChange={(e) => set("taRate", Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("form_slots_per_lesson_hint")}</p>
      </div>

      <div className="space-y-2">
        <Label>{t("form_deadline")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            value={values.deadlineDate}
            onChange={(e) => set("deadlineDate", e.target.value)}
          />
          <Input
            type="time"
            value={values.deadlineTime}
            onChange={(e) => set("deadlineTime", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meetUrl">{t("form_meet_url")}</Label>
        <Input
          id="meetUrl"
          type="url"
          placeholder="https://meet.google.com/..."
          value={values.meetUrl}
          onChange={(e) => set("meetUrl", e.target.value)}
        />
      </div>

      {values.meetUrl && (
        <div className="space-y-2">
          <Label>{t("form_meet_datetime")}</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={values.meetDate}
              onChange={(e) => set("meetDate", e.target.value)}
            />
            <Input
              type="time"
              value={values.meetTime}
              onChange={(e) => set("meetTime", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">{t("form_notes")}</Label>
        <textarea
          id="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("form_notes_placeholder")}
          className="flex w-full rounded-xl border border-input bg-white/70 backdrop-blur px-3.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {submitLabel}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
