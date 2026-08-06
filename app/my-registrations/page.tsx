"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Calendar,
  Clock,
  DollarSign,
  Inbox,
  Loader2,
  Users,
  X,
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
  listRegistrationsForUser,
  cancelRegistration,
  getTask,
  toDate,
} from "@/lib/db";
import {
  formatDateRange,
  formatDateShort,
  formatTimeRange,
  formatCurrency,
  durationHours,
  roundHours,
} from "@/lib/utils";
import {
  RATE_UNIT_LABEL,
  lessonStatusFor,
  lessonsFor,
  rateFor,
  rateUnitFor,
  type Registration,
  type RegistrationStatus,
  type Task,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

interface JoinedReg extends Registration {
  task: Task | null;
}

export default function MyRegistrationsPage() {
  const { user, loading, configured } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [items, setItems] = useState<JoinedReg[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!user) return;
    setBusy(true);
    try {
      const regs = await listRegistrationsForUser(user.uid);
      const enriched = await Promise.all(
        regs.map(async (r) => ({
          ...r,
          task: await getTask(r.taskId).catch(() => null),
        })),
      );
      setItems(enriched);
    } catch (err) {
      console.error(err);
      toast("error", t("load_reg_failed"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("need_sign_in")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("view_reg_need_sign_in")}
        </p>
        <Button asChild>
          <Link href="/">{t("browse_jobs")}</Link>
        </Button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("firebase_not_set_title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("firebase_not_set_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("my_reg_title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("my_reg_subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("refresh")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border/60 bg-card/30">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">{t("no_applications_title")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("no_applications_desc")}
          </p>
          <Button asChild>
            <Link href="/">{t("browse_jobs")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Row
              key={r.id}
              reg={r}
              onCancel={async () => {
                try {
                  await cancelRegistration(r.id);
                  toast("success", t("app_cancelled"));
                  await refresh();
                } catch (err) {
                  console.error(err);
                  toast("error", t("cancel_failed"));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function statusKeyOf(status: RegistrationStatus) {
  return status === "confirmed"
    ? "status_confirmed"
    : status === "declined"
      ? "status_declined"
      : status === "reserve"
        ? "status_reserve"
        : "status_pending";
}

function badgeVariantOf(status: RegistrationStatus) {
  return status === "confirmed"
    ? "success"
    : status === "declined"
      ? "destructive"
      : "warning";
}

function Row({ reg, onCancel }: { reg: JoinedReg; onCancel: () => void }) {
  const { t } = useLang();
  const task = reg.task;
  const lessons = task ? lessonsFor(reg, task) : [];
  const multi = lessons.length > 1;
  const start = lessons.length > 0 ? toDate(lessons[0].startAt) : null;
  const end =
    lessons.length > 0 ? toDate(lessons[lessons.length - 1].endAt) : null;
  const hours = roundHours(
    lessons.reduce(
      (sum, l) => sum + durationHours(toDate(l.startAt), toDate(l.endAt)),
      0,
    ),
  );
  const isConfirmed = reg.status === "confirmed";
  const confirmedCount = task
    ? lessons.filter((l) => lessonStatusFor(reg, l.id) === "confirmed").length
    : 0;

  return (
    <Card className={!isConfirmed ? "opacity-80" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {task?.schoolName ?? t("deleted_job")}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={badgeVariantOf(reg.status)}>
                {t(reg.position === "mt" ? "pos_mt" : "pos_ta")} ·{" "}
                {t(statusKeyOf(reg.status))}
              </Badge>
              {multi && (
                <span className="text-xs text-muted-foreground">
                  {confirmedCount} / {lessons.length} {t("lessons_confirmed_suffix")}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="gap-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
            {t("cancel_application")}
          </Button>
        </div>
      </CardHeader>
      {task && (
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDateRange(start, end)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {multi
                ? `${lessons.length} ${t("lessons_count_suffix")} · ${hours} ${t("hours_suffix")} ${t("total_suffix")}`
                : `${formatTimeRange(start, end)} (${hours} ${t("hours_suffix")})`}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(rateFor(task, reg.position))}
              {RATE_UNIT_LABEL[rateUnitFor(task)]} (
              {t(reg.position === "mt" ? "pos_mt" : "pos_ta")})
            </div>
          </div>

          {multi && (
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
                    const s = toDate(lesson.startAt);
                    const e = toDate(lesson.endAt);
                    const st = lessonStatusFor(reg, lesson.id);
                    return (
                      <tr key={lesson.id} className="border-t border-border/70">
                        <td className="px-3 py-2.5 font-medium">
                          {lesson.title || `${t("form_lesson")} ${i + 1}`}
                        </td>
                        <td className="px-3 py-2.5">{formatDateShort(s)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {formatTimeRange(s, e)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={badgeVariantOf(st)}>{t(statusKeyOf(st))}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
