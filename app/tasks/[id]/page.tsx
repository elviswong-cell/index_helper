"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileWarning,
  Hourglass,
  Loader2,
  MapPin,
  Phone,
  Users,
  Video,
} from "lucide-react";
import { TermsAndConduct } from "@/components/terms-and-conduct";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  getTask,
  registerForTask,
  listRegistrationsForTask,
  cancelRegistration,
  getUserProfile,
  toDate,
} from "@/lib/db";
import {
  formatDate,
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
  appliedSlots,
  capacityLabel,
  capacityOf,
  countsByLesson,
  lessonsOf,
  isProfileComplete,
  missingProfileFields,
  rateFor,
  rateUnitFor,
  slotKey,
  slotStatusFor,
  slotsLeft,
  taskSlots,
  type Position,
  type RegistrationStatus,
  type Slot,
  type Task,
  type Registration,
  type UserProfile,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

type LessonCounts = Record<string, Record<Position, number>>;

/** Every slot still taking applications, in lesson order. */
function openSlots(task: Task, counts: LessonCounts): Slot[] {
  return taskSlots(task).filter(
    (s) => slotsLeft(task, counts, s.lessonId, s.position) > 0,
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [task, setTask] = useState<Task | null>(null);
  const [counts, setCounts] = useState<LessonCounts>({});
  const [myReg, setMyReg] = useState<Registration | null>(null);
  /** Ticked slots, held as `slotKey()` strings. */
  const [selected, setSelected] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const fetched = await getTask(id);
      setTask(fetched);
      if (fetched) {
        const regs = await listRegistrationsForTask(fetched.id);
        const nextCounts = countsByLesson(fetched, regs);
        setCounts(nextCounts);

        // Default to every slot that still has room — the applicant unticks
        // the dates and roles they can't cover.
        setSelected(
          openSlots(fetched, nextCounts).map((s) => slotKey(s.lessonId, s.position)),
        );
        if (user) {
          setMyReg(regs.find((r) => r.userId === user.uid) ?? null);
          setProfile(await getUserProfile(user.uid));
        } else {
          setMyReg(null);
          setProfile(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast("error", t("load_failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function handleRegister() {
    if (!user || !task) return;
    if (!isProfileComplete(profile)) {
      toast("error", t("profile_required_toast"));
      return;
    }
    // Slots may have filled since the page loaded — never submit a full one.
    const stillOpen = openSlots(task, counts).filter((s) =>
      selected.includes(slotKey(s.lessonId, s.position)),
    );
    if (stillOpen.length === 0) {
      toast("error", t("select_lesson_required"));
      return;
    }
    setSubmitting(true);
    try {
      await registerForTask({
        taskId: task.id,
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? user.email ?? t("anonymous"),
        userPhone: profile?.phone ?? "",
        slots: stillOpen,
      });
      toast("success", t("app_submitted"));
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("apply_failed");
      toast("error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!myReg) return;
    try {
      await cancelRegistration(myReg.id);
      toast("success", t("app_cancelled"));
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", t("cancel_failed"));
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!task) {
    return (
      <div className="rounded-[20px] glass p-8 text-center">
        <Briefcase className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <h2 className="text-lg font-medium mb-2">{t("job_not_found")}</h2>
        <Button asChild variant="outline">
          <Link href="/">{t("back_to_jobs")}</Link>
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
  const deadline = toDate(task.deadline ?? null);
  const meetAt = toDate(task.meetAt ?? null);
  const isOpen = task.status === "open";
  const pastDeadline = !!deadline && new Date() > deadline;
  const unit = rateUnitFor(task);
  const missing = missingProfileFields(profile);
  const isFull = openSlots(task, counts).length === 0;

  function toggleSlot(lessonId: string, pos: Position) {
    if (slotsLeft(task!, counts, lessonId, pos) === 0) return;
    const key = slotKey(lessonId, pos);
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_jobs")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <CardTitle className="text-xl md:text-2xl">{task.schoolName}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    task.status === "cancelled"
                      ? "destructive"
                      : !isOpen || isFull
                        ? "muted"
                        : "success"
                  }
                >
                  {task.status === "cancelled"
                    ? t("status_cancelled")
                    : !isOpen
                      ? t("status_closed")
                      : isFull
                        ? t("status_full")
                        : t("status_open")}
                </Badge>
                {multi && (
                  <Badge variant="muted">
                    {lessons.length} {t("lessons_count_suffix")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("label_date")}>
              {formatDateRange(courseStart, courseEnd)}
            </InfoRow>
            <InfoRow icon={<Clock className="h-4 w-4" />} label={t("label_time")}>
              {multi ? (
                <>
                  {lessons.length} {t("lessons_count_suffix")} · {totalHours}{" "}
                  {t("hours_suffix")} {t("total_suffix")}
                </>
              ) : (
                <>
                  {formatTimeRange(courseStart, courseEnd)} ({totalHours}{" "}
                  {t("hours_suffix")})
                </>
              )}
            </InfoRow>
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label={t("label_pay")}>
              MT {formatCurrency(rateFor(task, "mt"))} · TA{" "}
              {formatCurrency(rateFor(task, "ta"))}
              {RATE_UNIT_LABEL[unit]}
            </InfoRow>
            <InfoRow icon={<Users className="h-4 w-4" />} label={t("label_slots")}>
              MT {capacityLabel(task, "mt")} · TA {capacityLabel(task, "ta")}
              {multi && ` (${t("per_lesson")})`}
            </InfoRow>
            {task.address && (
              <div className="md:col-span-2">
                <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("label_address")}>
                  <span className="block">{task.address}</span>
                  {task.mapUrl && (
                    <a
                      href={task.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-primary hover:underline text-sm font-normal"
                    >
                      {t("open_in_maps")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </InfoRow>
              </div>
            )}
            {deadline && (
              <InfoRow icon={<Hourglass className="h-4 w-4" />} label={t("label_deadline")}>
                <span className={pastDeadline ? "text-destructive" : undefined}>
                  {formatDate(deadline)}{" "}
                  {deadline.toLocaleTimeString("zh-HK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {pastDeadline && t("deadline_closed_paren")}
                </span>
              </InfoRow>
            )}
            {task.meetUrl && (
              <InfoRow icon={<Video className="h-4 w-4" />} label={t("label_meeting")}>
                <a
                  href={task.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t("join_meet")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {meetAt && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {formatDate(meetAt)}{" "}
                    {meetAt.toLocaleTimeString("zh-HK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </InfoRow>
            )}
          </div>

          {task.notes && (
            <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("label_notes")}</p>
              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {isOpen && (
            <div className="border-t border-white/60 pt-6 space-y-4">
              {myReg ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        myReg.status === "confirmed"
                          ? "text-[hsl(var(--success))]"
                          : myReg.status === "declined"
                            ? "text-destructive"
                            : "text-[hsl(var(--warning))]"
                      }`}
                    />
                    <span className="font-medium">
                      {t("already_applied")}{" "}
                      {appliedRoleLabel(myReg, task, t)} —{" "}
                      {t(statusKey(myReg.status))}
                    </span>
                  </div>

                  <MyLessonsTable task={task} reg={myReg} />

                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="w-full sm:w-auto"
                  >
                    {t("cancel_application")}
                  </Button>
                </div>
              ) : !user ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{t("please_sign_in")}</p>
                  <Button onClick={() => signInWithGoogle()}>{t("google_login")}</Button>
                </div>
              ) : pastDeadline ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-center text-sm text-muted-foreground">
                  {t("past_deadline")}
                </div>
              ) : missing.length > 0 ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <FileWarning className="h-5 w-5 shrink-0 mt-0.5 text-[hsl(var(--warning))]" />
                    <div>
                      <p className="font-medium text-sm">{t("profile_required_title")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("profile_required_desc")}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-sm">
                        {missing.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-[hsl(var(--warning))]" />
                            {t(`field_${f}` as never)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href="/settings">{t("go_to_settings")}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <LessonPicker
                    task={task}
                    counts={counts}
                    selected={selected}
                    onToggle={toggleSlot}
                    onSelectAll={() =>
                      setSelected(
                        openSlots(task, counts).map((s) =>
                          slotKey(s.lessonId, s.position),
                        ),
                      )
                    }
                    onClearAll={() => setSelected([])}
                  />

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {t("contact_phone")}: {profile?.phone}
                    <Link href="/settings" className="text-primary hover:underline">
                      {t("edit")}
                    </Link>
                  </div>

                  <Button
                    onClick={handleRegister}
                    disabled={submitting || selected.length === 0}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("submitting")}
                      </>
                    ) : (
                      `${t("submit_application")} (${selected.length} ${t("slot_count_suffix")})`
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("submit_note")}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TermsAndConduct />
    </div>
  );
}

/** "MT 主導師" or "MT 主導師 / TA 助教" when the application mixes roles. */
function appliedRoleLabel(
  reg: Registration,
  task: Task,
  t: (key: never) => string,
): string {
  const roles = appliedSlots(reg, task).map((s) => s.position);
  return POSITIONS.filter((p) => roles.includes(p))
    .map((p) => t((p === "mt" ? "pos_mt" : "pos_ta") as never))
    .join(" / ");
}

function statusKey(status: RegistrationStatus) {
  return status === "confirmed"
    ? "status_confirmed"
    : status === "declined"
      ? "status_declined"
      : status === "reserve"
        ? "status_reserve"
        : "status_pending";
}

function statusVariant(status: RegistrationStatus) {
  return status === "confirmed"
    ? "success"
    : status === "declined"
      ? "destructive"
      : "warning";
}

/**
 * The lesson table an applicant ticks before submitting. Each lesson gets its
 * own MT and TA column, since a lesson may be hiring one role, the other, or
 * both — a role with no slots on that lesson shows a dash.
 */
function LessonPicker({
  task,
  counts,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  task: Task;
  counts: LessonCounts;
  selected: string[];
  onToggle: (lessonId: string, position: Position) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const { t } = useLang();
  const lessons = lessonsOf(task);
  const unit = rateUnitFor(task);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Label>{t("select_lessons")}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t("select_lessons_hint")}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
            {t("select_all")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClearAll}>
            {t("clear_all")}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="bg-white/60 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
              {POSITIONS.map((pos) => (
                <th
                  key={pos}
                  className="px-3 py-2 text-center font-medium border-l border-border/70"
                >
                  <div className="font-semibold text-foreground">
                    {t(pos === "mt" ? "pos_mt" : "pos_ta")}
                  </div>
                  <div className="font-normal">
                    {formatCurrency(rateFor(task, pos))}
                    {RATE_UNIT_LABEL[unit]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson, i) => {
              const start = toDate(lesson.startAt);
              const end = toDate(lesson.endAt);
              const cap = capacityOf(task, lesson);
              return (
                <tr key={lesson.id} className="border-t border-border/70">
                  <td className="px-3 py-2.5 font-medium">
                    {lesson.title || `${t("form_lesson")} ${i + 1}`}
                  </td>
                  <td className="px-3 py-2.5">{formatDateShort(start)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatTimeRange(start, end)}
                  </td>
                  {POSITIONS.map((pos) => {
                    // Not hiring this role on this lesson at all.
                    if (cap[pos] === 0) {
                      return (
                        <td
                          key={pos}
                          className="px-3 py-2.5 text-center text-muted-foreground/50 border-l border-border/70"
                        >
                          —
                        </td>
                      );
                    }
                    const left = slotsLeft(task, counts, lesson.id, pos);
                    const isFull = left === 0;
                    const isSelected = selected.includes(slotKey(lesson.id, pos));
                    return (
                      <td
                        key={pos}
                        onClick={() => onToggle(lesson.id, pos)}
                        aria-disabled={isFull}
                        className={`px-3 py-2.5 text-center border-l border-border/70 transition-colors ${
                          isFull
                            ? "cursor-not-allowed opacity-50"
                            : `cursor-pointer ${
                                isSelected ? "bg-primary/5" : "hover:bg-white/40"
                              }`
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFull}
                            onChange={() => onToggle(lesson.id, pos)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 accent-[hsl(var(--primary))] cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`${lesson.title || `${t("form_lesson")} ${i + 1}`} ${
                              pos === "mt" ? t("pos_mt") : t("pos_ta")
                            }`}
                          />
                          {isFull ? (
                            <Badge variant="muted" className="text-[10px]">
                              {t("full")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {left} / {cap[pos]}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("full_lesson_locked_hint")}</p>
    </div>
  );
}

/** Per-slot result table shown after the admin has reviewed. */
function MyLessonsTable({ task, reg }: { task: Task; reg: Registration }) {
  const { t } = useLang();
  const slots = appliedSlots(reg, task);
  const lessons = lessonsOf(task);
  const indexOf = new Map(lessons.map((l, i) => [l.id, i]));
  if (slots.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-white/60 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_role")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_status")}</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const lesson = lessons.find((l) => l.id === slot.lessonId);
            if (!lesson) return null;
            const start = toDate(lesson.startAt);
            const end = toDate(lesson.endAt);
            const st = slotStatusFor(reg, slot.lessonId, slot.position);
            return (
              <tr
                key={slotKey(slot.lessonId, slot.position)}
                className="border-t border-border/70"
              >
                <td className="px-3 py-2.5 font-medium">
                  {lesson.title ||
                    `${t("form_lesson")} ${(indexOf.get(lesson.id) ?? 0) + 1}`}
                </td>
                <td className="px-3 py-2.5">{formatDateShort(start)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {formatTimeRange(start, end)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {t(slot.position === "mt" ? "pos_mt" : "pos_ta")}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={statusVariant(st)}>{t(statusKey(st))}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InfoRow({
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
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
