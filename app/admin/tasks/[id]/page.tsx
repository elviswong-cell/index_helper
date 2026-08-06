"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Send,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  getTask,
  listRegistrationsForTask,
  cancelRegistration,
  decideRegistration,
  cancelTask,
  reopenTask,
  toDate,
} from "@/lib/db";
import { sendStatusEmail } from "@/lib/mail";
import {
  formatDateRange,
  formatDateShort,
  formatTimeRange,
  formatCurrency,
  durationHours,
  roundHours,
} from "@/lib/utils";
import {
  POSITIONS,
  RATE_UNIT_LABEL,
  aggregateStatus,
  confirmedFor,
  countsByLesson,
  lessonStatusMap,
  lessonsFor,
  lessonsOf,
  rateFor,
  rateUnitFor,
  type Lesson,
  type Position,
  type Task,
  type Registration,
  type RegistrationStatus,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

const DECISIONS: RegistrationStatus[] = ["confirmed", "reserve", "declined"];

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [task, setTask] = useState<Task | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const fetched = await getTask(id);
      setTask(fetched);
      if (fetched) setRegs(await listRegistrationsForTask(fetched.id));
    } catch (err) {
      console.error(err);
      toast("error", t("load_failed_generic"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Save the admin's per-lesson decisions, then (optionally) email the applicant. */
  async function handleSave(
    reg: Registration,
    decisions: Record<string, RegistrationStatus>,
    notify: boolean,
  ) {
    if (!task) return;
    setBusy(true);
    try {
      const updated = await decideRegistration(reg, task, decisions);
      toast("success", `${t("decisions_saved")}: ${reg.userName}`);
      await refresh();
      if (notify) {
        const emailStatus =
          updated.status === "pending" ? null : (updated.status as
            | "confirmed"
            | "declined"
            | "reserve");
        if (!emailStatus) {
          toast("error", t("email_skipped_pending"));
        } else {
          try {
            await sendStatusEmail(updated, task, emailStatus);
            toast("success", t("email_sent"));
          } catch (mailErr) {
            console.error(mailErr);
            toast("error", t("email_failed_toast"));
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("confirm_failed");
      toast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(reg: Registration) {
    if (!confirm(t("remove_confirm"))) return;
    setBusy(true);
    try {
      await cancelRegistration(reg.id);
      toast("success", t("removed_toast"));
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", t("remove_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    if (!task) return;
    setBusy(true);
    try {
      if (task.status === "open") {
        await cancelTask(task.id);
        toast("success", t("job_cancelled_toast"));
      } else if (task.status === "cancelled") {
        await reopenTask(task.id);
        toast("success", t("job_reopened_toast"));
      }
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", t("job_status_update_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!task) {
    return (
      <div className="rounded-[20px] glass p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">{t("job_not_found_admin")}</h2>
        <Button asChild variant="outline">
          <Link href="/admin">{t("back_to_admin")}</Link>
        </Button>
      </div>
    );
  }

  const lessons = lessonsOf(task);
  const multi = lessons.length > 1;
  const courseStart = toDate(lessons[0].startAt);
  const courseEnd = toDate(lessons[lessons.length - 1].endAt);
  const totalHours = roundHours(
    lessons.reduce(
      (sum, l) => sum + durationHours(toDate(l.startAt), toDate(l.endAt)),
      0,
    ),
  );
  const unit = rateUnitFor(task);
  const counts = countsByLesson(task, regs);

  const statusOrder: Record<RegistrationStatus, number> = {
    pending: 0,
    reserve: 1,
    confirmed: 2,
    declined: 3,
  };
  const sortedRegs = [...regs].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status],
  );
  const pendingCount = regs.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_admin")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{task.schoolName}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    task.status === "open"
                      ? "success"
                      : task.status === "cancelled"
                        ? "destructive"
                        : "muted"
                  }
                >
                  {t(
                    task.status === "open"
                      ? "status_open"
                      : task.status === "cancelled"
                        ? "status_cancelled"
                        : "status_closed",
                  )}
                </Badge>
                <Badge variant="muted">
                  {lessons.length} {t("lessons_count_suffix")}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/admin/tasks/${task.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  {t("edit_job_btn")}
                </Link>
              </Button>
              <Button variant="outline" onClick={toggleStatus} disabled={busy}>
                {task.status === "open"
                  ? t("cancel_job")
                  : task.status === "cancelled"
                    ? t("reopen_job")
                    : t("no_action")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Field icon={<Calendar className="h-4 w-4" />} label={t("label_date")}>
              {formatDateRange(courseStart, courseEnd)}
            </Field>
            <Field icon={<Clock className="h-4 w-4" />} label={t("label_time")}>
              {multi
                ? `${lessons.length} ${t("lessons_count_suffix")} · ${totalHours} ${t("hours_suffix")} ${t("total_suffix")}`
                : `${formatTimeRange(courseStart, courseEnd)} (${totalHours} ${t("hours_suffix")})`}
            </Field>
            <Field icon={<DollarSign className="h-4 w-4" />} label={t("label_pay")}>
              MT {formatCurrency(rateFor(task, "mt"))} · TA{" "}
              {formatCurrency(rateFor(task, "ta"))}
              {RATE_UNIT_LABEL[unit]}
            </Field>
            <Field icon={<Users className="h-4 w-4" />} label={t("label_slots")}>
              MT {task.positions.mt} · TA {task.positions.ta}
              {multi && ` (${t("per_lesson")})`}
            </Field>
            {task.address && (
              <div className="md:col-span-2">
                <Field icon={<MapPin className="h-4 w-4" />} label={t("label_address")}>
                  {task.address}
                </Field>
              </div>
            )}
          </div>
          {task.notes && (
            <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{t("label_notes")}</p>
              <p className="whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roster: who is confirmed for each lesson */}
      <Card>
        <CardHeader>
          <CardTitle>{t("lesson_roster_title")}</CardTitle>
          <CardDescription>{t("lesson_roster_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-white/60 text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
                  {POSITIONS.map((pos) => (
                    <th key={pos} className="px-3 py-2 text-left font-medium">
                      {t(pos === "mt" ? "pos_mt" : "pos_ta")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson, i) => (
                  <RosterRow
                    key={lesson.id}
                    task={task}
                    regs={regs}
                    lesson={lesson}
                    index={i}
                    counts={counts}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>{t("registrations_title")}</CardTitle>
          <CardDescription>
            {regs.length} {t("applied_count")} · {pendingCount} {t("pending_short")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("no_applications_admin")}
            </p>
          ) : (
            <div className="space-y-3">
              {sortedRegs.map((r) => (
                <RegistrationRow
                  key={r.id}
                  task={task}
                  reg={r}
                  counts={counts}
                  busy={busy}
                  onSave={(decisions, notify) => handleSave(r, decisions, notify)}
                  onRemove={() => handleRemove(r)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RosterRow({
  task,
  regs,
  lesson,
  index,
  counts,
}: {
  task: Task;
  regs: Registration[];
  lesson: Lesson;
  index: number;
  counts: Record<string, Record<Position, number>>;
}) {
  const { t } = useLang();
  const start = toDate(lesson.startAt);
  const end = toDate(lesson.endAt);

  return (
    <tr className="border-t border-border/70 align-top">
      <td className="px-3 py-2.5 font-medium whitespace-nowrap">
        {lesson.title || `${t("form_lesson")} ${index + 1}`}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">{formatDateShort(start)}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">{formatTimeRange(start, end)}</td>
      {POSITIONS.map((pos) => {
        const cap = task.positions[pos];
        const taken = counts[lesson.id]?.[pos] ?? 0;
        const names = confirmedFor(task, regs, lesson.id, pos).map((r) => r.userName);
        return (
          <td key={pos} className="px-3 py-2.5">
            <span
              className={`text-xs font-medium ${
                taken >= cap ? "text-[hsl(var(--success))]" : "text-muted-foreground"
              }`}
            >
              {taken} / {cap}
            </span>
            {names.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {names.map((n) => (
                  <span
                    key={n}
                    className="rounded-md bg-[hsl(var(--success))]/10 px-1.5 py-0.5 text-[11px] text-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * One application. The admin toggles a decision per lesson locally, then saves
 * everything at once so a partial accept sends a single email.
 */
function RegistrationRow({
  task,
  reg,
  counts,
  busy,
  onSave,
  onRemove,
}: {
  task: Task;
  reg: Registration;
  counts: Record<string, Record<Position, number>>;
  busy: boolean;
  onSave: (
    decisions: Record<string, RegistrationStatus>,
    notify: boolean,
  ) => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useLang();
  const saved = useMemo(() => lessonStatusMap(reg, task), [reg, task]);
  const [draft, setDraft] = useState<Record<string, RegistrationStatus>>(saved);
  const [notify, setNotify] = useState(true);

  // Re-sync after a save (or an external refresh) replaces the registration.
  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const applied = lessonsFor(reg, task);
  const dirty = applied.some((l) => draft[l.id] !== saved[l.id]);
  const draftStatus = aggregateStatus(applied.map((l) => draft[l.id]));
  const confirmedCount = applied.filter((l) => draft[l.id] === "confirmed").length;

  function setAll(status: RegistrationStatus) {
    const next: Record<string, RegistrationStatus> = { ...draft };
    for (const l of applied) next[l.id] = status;
    setDraft(next);
  }

  return (
    <div
      className={`rounded-2xl border p-3 space-y-3 ${
        reg.status === "confirmed"
          ? "border-white/60 bg-white/50"
          : reg.status === "declined"
            ? "border-destructive/20 bg-destructive/5"
            : "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{reg.userName}</span>
            <Badge variant={badgeVariant(reg.status)}>
              {t(reg.position === "mt" ? "pos_mt" : "pos_ta")} ·{" "}
              {t(statusLabelKey(reg.status))}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {confirmedCount} / {applied.length} {t("lessons_confirmed_suffix")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <a
              href={`mailto:${reg.userEmail}`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Mail className="h-3 w-3" />
              {reg.userEmail}
            </a>
            {reg.userPhone && (
              <a
                href={`tel:${reg.userPhone}`}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Phone className="h-3 w-3" />
                {reg.userPhone}
              </a>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive"
          aria-label={t("remove_application")}
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-white/40">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_filled")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_decision")}</th>
            </tr>
          </thead>
          <tbody>
            {applied.map((lesson, i) => {
              const start = toDate(lesson.startAt);
              const end = toDate(lesson.endAt);
              const cap = task.positions[reg.position];
              // Exclude this applicant so the number reads "others already in".
              const taken =
                (counts[lesson.id]?.[reg.position] ?? 0) -
                (saved[lesson.id] === "confirmed" ? 1 : 0);
              return (
                <tr key={lesson.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {lesson.title || `${t("form_lesson")} ${i + 1}`}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateShort(start)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatTimeRange(start, end)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {taken} / {cap}
                    {taken >= cap && draft[lesson.id] !== "confirmed" && (
                      <span className="ml-1 text-destructive">({t("full")})</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {DECISIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDraft({ ...draft, [lesson.id]: d })}
                          className={`press rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                            draft[lesson.id] === d
                              ? decisionActiveClass(d)
                              : "border-border bg-white/60 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {t(statusLabelKey(d))}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAll("confirmed")}
          className="text-[hsl(var(--success))] hover:text-[hsl(var(--success))] gap-1"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t("confirm_all")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAll("reserve")}
          className="text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))] gap-1"
        >
          <Users className="h-4 w-4" />
          {t("reserve_all")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAll("declined")}
          className="text-destructive hover:text-destructive gap-1"
        >
          <XCircle className="h-4 w-4" />
          {t("decline_all")}
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            {t("notify_by_email")}
          </label>
          <Button
            size="sm"
            disabled={busy || !dirty}
            onClick={() => onSave(draft, notify)}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {dirty
              ? `${t("save_decisions")} (${t(statusLabelKey(draftStatus))})`
              : t("no_changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function decisionActiveClass(status: RegistrationStatus): string {
  if (status === "confirmed")
    return "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
  if (status === "declined")
    return "border-destructive bg-destructive/10 text-destructive";
  return "border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]";
}

function badgeVariant(status: RegistrationStatus) {
  return status === "confirmed"
    ? "success"
    : status === "declined"
      ? "destructive"
      : "warning";
}

function statusLabelKey(status: RegistrationStatus) {
  return status === "confirmed"
    ? "status_confirmed"
    : status === "declined"
      ? "status_declined"
      : status === "reserve"
        ? "status_reserve"
        : "status_pending";
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{children}</p>
      </div>
    </div>
  );
}
