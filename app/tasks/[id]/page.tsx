"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Hourglass,
  Loader2,
  MapPin,
  Phone,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  getTask,
  registerForTask,
  countConfirmed,
  listRegistrationsForTask,
  cancelRegistration,
  getUserProfile,
  toDate,
} from "@/lib/db";
import {
  formatDate,
  formatTimeRange,
  formatCurrency,
  durationHours,
} from "@/lib/utils";
import {
  POSITIONS,
  RATE_UNIT_LABEL,
  rateFor,
  rateUnitFor,
  type Position,
  type Task,
  type Registration,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [task, setTask] = useState<Task | null>(null);
  const [counts, setCounts] = useState<Record<Position, number>>({ mt: 0, ta: 0 });
  const [myReg, setMyReg] = useState<Registration | null>(null);
  const [position, setPosition] = useState<Position>("mt");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const t = await getTask(id);
      setTask(t);
      if (t) {
        const [mt, ta] = await Promise.all([
          countConfirmed(t.id, "mt"),
          countConfirmed(t.id, "ta"),
        ]);
        setCounts({ mt, ta });
        if (user) {
          const regs = await listRegistrationsForTask(t.id);
          setMyReg(regs.find((r) => r.userId === user.uid) ?? null);
          const profile = await getUserProfile(user.uid);
          setPhone(profile?.phone ?? "");
        } else {
          setMyReg(null);
          setPhone("");
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
    if (!phone) {
      toast("error", t("phone_required_toast"));
      return;
    }
    setSubmitting(true);
    try {
      await registerForTask({
        taskId: task.id,
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? user.email ?? t("anonymous"),
        userPhone: phone,
        position,
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

  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);
  const deadline = toDate(task.deadline ?? null);
  const meetAt = toDate(task.meetAt ?? null);
  const isOpen = task.status === "open";
  const pastDeadline = !!deadline && new Date() > deadline;
  const unit = rateUnitFor(task);

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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t("label_date")}>
              {formatDate(start)}
            </InfoRow>
            <InfoRow icon={<Clock className="h-4 w-4" />} label={t("label_time")}>
              {formatTimeRange(start, end)} ({hours} {t("hours_suffix")})
            </InfoRow>
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label={t("label_pay")}>
              MT {formatCurrency(rateFor(task, "mt"))} · TA{" "}
              {formatCurrency(rateFor(task, "ta"))}
              {RATE_UNIT_LABEL[unit]}
            </InfoRow>
            <InfoRow icon={<Users className="h-4 w-4" />} label={t("label_slots")}>
              MT {counts.mt}/{task.positions.mt} · TA {counts.ta}/{task.positions.ta}
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
                  {formatDate(deadline)} {deadline.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}
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
                    {formatDate(meetAt)} {meetAt.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}
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
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-5 w-5 ${myReg.status === "confirmed" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}`}
                    />
                    <span className="font-medium">
                      {t("already_applied")} {t(myReg.position === "mt" ? "pos_mt" : "pos_ta")} —{" "}
                      {myReg.status === "confirmed" ? t("status_confirmed") : t("status_pending")}
                    </span>
                  </div>
                  <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                    {t("cancel_application")}
                  </Button>
                </div>
              ) : !user ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t("please_sign_in")}
                  </p>
                  <Button onClick={() => signInWithGoogle()}>{t("google_login")}</Button>
                </div>
              ) : pastDeadline ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-center text-sm text-muted-foreground">
                  {t("past_deadline")}
                </div>
              ) : !phone ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Phone className="h-5 w-5 shrink-0 mt-0.5 text-[hsl(var(--warning))]" />
                    <div>
                      <p className="font-medium text-sm">{t("no_phone_title")}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("no_phone_desc")}
                      </p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href="/settings">{t("go_to_settings")}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("select_position")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {POSITIONS.map((pos) => (
                        <PositionOption
                          key={pos}
                          label={t(pos === "mt" ? "pos_mt" : "pos_ta")}
                          rate={rateFor(task, pos)}
                          unit={unit}
                          current={counts[pos]}
                          total={task.positions[pos]}
                          selected={position === pos}
                          onSelect={() => setPosition(pos)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {t("contact_phone")}: {phone}
                    <Link href="/settings" className="text-primary hover:underline">
                      {t("edit")}
                    </Link>
                  </div>

                  <Button
                    onClick={handleRegister}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("submitting")}
                      </>
                    ) : (
                      t("submit_application")
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("submit_note")}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
  current,
  total,
  selected,
  onSelect,
}: {
  label: string;
  rate: number;
  unit: "hourly" | "daily";
  current: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLang();
  const full = current >= total;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`press text-left rounded-2xl border p-3 transition-colors ${
        selected
          ? "border-primary ring-1 ring-primary/40 bg-primary/5"
          : "border-border hover:border-primary/50 bg-white/50"
      } ${full ? "opacity-70" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
        {full && (
          <Badge variant="muted" className="text-[10px]">
            {t("full")}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {formatCurrency(rate)}
        {RATE_UNIT_LABEL[unit]}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("confirmed_of")} {current} / {total}
      </p>
    </button>
  );
}
