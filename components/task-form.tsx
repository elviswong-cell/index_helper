"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RateUnit } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export interface TaskFormValues {
  schoolName: string;
  address: string;
  mapUrl: string;
  date: string;
  startTime: string;
  endTime: string;
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

export const emptyTaskForm: TaskFormValues = {
  schoolName: "",
  address: "",
  mapUrl: "",
  date: "",
  startTime: "",
  endTime: "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!values.date || !values.startTime || !values.endTime) {
      setError(t("form_error_datetime"));
      return;
    }
    const start = new Date(`${values.date}T${values.startTime}:00`);
    const end = new Date(`${values.date}T${values.endTime}:00`);
    if (end <= start) {
      setError(t("form_error_end_after_start"));
      return;
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">{t("form_date")}</Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">{t("form_start_time")}</Label>
          <Input
            id="startTime"
            type="time"
            value={values.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">{t("form_end_time")}</Label>
          <Input
            id="endTime"
            type="time"
            value={values.endTime}
            onChange={(e) => set("endTime", e.target.value)}
            required
          />
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
