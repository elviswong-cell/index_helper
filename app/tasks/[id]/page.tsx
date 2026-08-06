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
  countsByLesson,
  lessonIdsFor,
  lessonStatusFor,
  lessonsOf,
  isProfileComplete,
  missingProfileFields,
  rateFor,
  rateUnitFor,
  type Position,
  type RegistrationStatus,
  type Task,
  type Registration,
  type UserProfile,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

type LessonCounts = Record<string, Record<Position, number>>;

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [task, setTask] = useState<Task | null>(null);
  const [counts, setCounts] = useState<LessonCounts>({});
  const [myReg, setMyReg] = useState<Registration | null>(null);
  const [position, setPosition] = useState<Position>("mt");
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
        setCounts(countsByLesson(fetched, regs));
        // Default to signing up for every lesson.
        setSelected(lessonsOf(fetched).map((l) => l.id));
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
    if (selected.length === 0) {
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
        position,
        lessonIds: selected,
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

  function toggleLesson(lessonId: string) {
    setSelected((prev) =>
      prev.includes(lessonId)
        ? prev.filter((x) => x !== lessonId)
        : [...prev, lessonId],
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
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
                    isOpen
                      ? "success"
                      : task.status === "cancelled"
                        ? "destructive"
                        : "muted"
                  }
                >
                  {isOpen
                    ? t("status_open")
                    : task.status === "cancelled"
                      ? t("status_cancelled")
                      : t("status_closed")}
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
              MT {task.positions.mt} · TA {task.positions.ta}
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
                      {t(myReg.position === "mt" ? "pos_mt" : "pos_ta")} —{" "}
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
                  <div className="space-y-2">
                    <Label>{t("select_position")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {POSITIONS.map((pos) => (
                        <PositionOption
                          key={pos}
                          label={t(pos === "mt" ? "pos_mt" : "pos_ta")}
                          rate={rateFor(task, pos)}
                          unit={unit}
                          total={task.positions[pos]}
                          selected={position === pos}
                          onSelect={() => setPosition(pos)}
                        />
                      ))}
                    </div>
                  </div>

                  <LessonPicker
                    task={task}
                    counts={counts}
                    position={position}
                    selected={selected}
                    onToggle={toggleLesson}
                    onSelectAll={() => setSelected(lessons.map((l) => l.id))}
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
                      `${t("submit_application")} (${selected.length} ${t("lessons_count_suffix")})`
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

/** The lesson table an applicant ticks before submitting. */
function LessonPicker({
  task,
  counts,
  position,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  task: Task;
  counts: LessonCounts;
  position: Position;
  selected: string[];
  onToggle: (lessonId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const { t } = useLang();
  const lessons = lessonsOf(task);
  const cap = task.positions[position];

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
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-white/60 text-xs text-muted-foreground">
              <th className="px-3 py-2 w-10" />
              <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
              <th className="px-3 py-2 text-left font-medium">{t("th_slots_left")}</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson, i) => {
              const start = toDate(lesson.startAt);
              const end = toDate(lesson.endAt);
              const taken = counts[lesson.id]?.[position] ?? 0;
              const left = Math.max(0, cap - taken);
              const isSelected = selected.includes(lesson.id);
              return (
                <tr
                  key={lesson.id}
                  onClick={() => onToggle(lesson.id)}
                  className={`border-t border-border/70 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-white/40"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(lesson.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-[hsl(var(--primary))] cursor-pointer"
                      aria-label={lesson.title || `${t("form_lesson")} ${i + 1}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    {lesson.title || `${t("form_lesson")} ${i + 1}`}
                  </td>
                  <td className="px-3 py-2.5">{formatDateShort(start)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatTimeRange(start, end)}
                  </td>
                  <td className="px-3 py-2.5">
                    {left === 0 ? (
                      <Badge variant="muted" className="text-[10px]">
                        {t("full")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {left} / {cap}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("full_still_apply_hint")}</p>
    </div>
  );
}

/** Per-lesson result table shown after the admin has reviewed. */
function MyLessonsTable({ task, reg }: { task: Task; reg: Registration }) {
  const { t } = useLang();
  const ids = lessonIdsFor(reg, task);
  const lessons = lessonsOf(task).filter((l) => ids.includes(l.id));
  if (lessons.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[460px] text-sm">
        <thead>
          <tr className="bg-white/60 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{t("th_lesson")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("th_status")}</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson, i) => {
            const start = toDate(lesson.startAt);
            const end = toDate(lesson.endAt);
            const st = lessonStatusFor(reg, lesson.id);
            return (
              <tr key={lesson.id} className="border-t border-border/70">
                <td className="px-3 py-2.5 font-medium">
                  {lesson.title || `${t("form_lesson")} ${i + 1}`}
                </td>
                <td className="px-3 py-2.5">{formatDateShort(start)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {formatTimeRange(start, end)}
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

function PositionOption({
  label,
  rate,
  unit,
  total,
  selected,
  onSelect,
}: {
  label: string;
  rate: number;
  unit: "hourly" | "daily";
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`press text-left rounded-2xl border p-3 transition-colors ${
        selected
          ? "border-primary ring-1 ring-primary/40 bg-primary/5"
          : "border-border hover:border-primary/50 bg-white/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {formatCurrency(rate)}
        {RATE_UNIT_LABEL[unit]}
      </p>
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <CalendarDays className="h-3 w-3" />
        {total} {t("slots_suffix")} {t("per_lesson")}
      </p>
    </button>
  );
}
