"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  Pencil,
  Phone,
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
  confirmRegistration,
  declineRegistration,
  reserveRegistration,
  cancelTask,
  reopenTask,
  toDate,
} from "@/lib/db";
import { sendStatusEmail } from "@/lib/mail";
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import {
  RATE_UNIT_LABEL,
  rateFor,
  rateUnitFor,
  type Task,
  type Registration,
  type RegistrationStatus,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

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
      const t = await getTask(id);
      setTask(t);
      if (t) {
        const r = await listRegistrationsForTask(t.id);
        setRegs(r);
      }
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

  async function handleConfirm(reg: Registration) {
    if (!task) return;
    setBusy(true);
    try {
      await confirmRegistration(reg, task);
      toast("success", `${t("confirmed_toast")}: ${reg.userName}`);
      await refresh();
      try {
        await sendStatusEmail(reg, task.schoolName, "confirmed");
      } catch (mailErr) {
        console.error(mailErr);
        toast("error", t("email_failed_toast"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("confirm_failed");
      toast("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline(reg: Registration) {
    if (!task) return;
    setBusy(true);
    try {
      await declineRegistration(reg);
      toast("success", `${t("declined_toast")}: ${reg.userName}`);
      await refresh();
      try {
        await sendStatusEmail(reg, task.schoolName, "declined");
      } catch (mailErr) {
        console.error(mailErr);
        toast("error", t("email_failed_toast"));
      }
    } catch (err) {
      console.error(err);
      toast("error", t("decline_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleReserve(reg: Registration) {
    if (!task) return;
    setBusy(true);
    try {
      await reserveRegistration(reg);
      toast("success", `${t("reserved_toast")}: ${reg.userName}`);
      await refresh();
      try {
        await sendStatusEmail(reg, task.schoolName, "reserve");
      } catch (mailErr) {
        console.error(mailErr);
        toast("error", t("email_failed_toast"));
      }
    } catch (err) {
      console.error(err);
      toast("error", t("reserve_failed"));
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

  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);
  const confirmedMt = regs.filter((r) => r.position === "mt" && r.status === "confirmed").length;
  const confirmedTa = regs.filter((r) => r.position === "ta" && r.status === "confirmed").length;
  const unit = rateUnitFor(task);

  const statusOrder: Record<RegistrationStatus, number> = {
    pending: 0,
    reserve: 1,
    confirmed: 2,
    declined: 3,
  };
  const sortedRegs = [...regs].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const statusBadgeVariant = (s: RegistrationStatus) =>
    s === "confirmed" ? "success" : s === "declined" ? "destructive" : "warning";
  const statusLabelKey = (s: RegistrationStatus) =>
    s === "confirmed"
      ? "status_confirmed"
      : s === "declined"
        ? "status_declined"
        : s === "reserve"
          ? "status_reserve"
          : "status_pending";

  return (
    <div className="space-y-6 max-w-4xl">
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
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("label_date")}</p>
                <p className="font-medium">{formatDate(start)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("label_time")}</p>
                <p className="font-medium">{formatTimeRange(start, end)} ({hours} {t("hours_suffix")})</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("label_pay")}</p>
                <p className="font-medium">
                  MT {formatCurrency(rateFor(task, "mt"))} · TA {formatCurrency(rateFor(task, "ta"))}
                  {RATE_UNIT_LABEL[unit]}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("admin_confirmed_slots")}</p>
                <p className="font-medium">
                  MT {confirmedMt}/{task.positions.mt} · TA {confirmedTa}/{task.positions.ta}
                </p>
              </div>
            </div>
          </div>
          {task.notes && (
            <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{t("label_notes")}</p>
              <p className="whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>{t("registrations_title")}</CardTitle>
          <CardDescription>
            {regs.length} {t("applied_count")} ({confirmedMt + confirmedTa} {t("confirmed_short")})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("no_applications_admin")}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedRegs.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 flex-wrap ${
                    r.status === "confirmed"
                      ? "border-white/60 bg-white/50"
                      : r.status === "declined"
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.userName}</span>
                      <Badge variant={statusBadgeVariant(r.status)}>
                        {t(r.position === "mt" ? "pos_mt" : "pos_ta")} · {t(statusLabelKey(r.status))}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <a
                        href={`mailto:${r.userEmail}`}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {r.userEmail}
                      </a>
                      {r.userPhone && (
                        <a
                          href={`tel:${r.userPhone}`}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {r.userPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {r.status !== "confirmed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(r)}
                        disabled={busy}
                        className="text-[hsl(var(--success))] hover:text-[hsl(var(--success))] gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t("confirm_btn")}
                      </Button>
                    )}
                    {r.status !== "reserve" && r.status !== "confirmed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReserve(r)}
                        disabled={busy}
                        className="text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))] gap-1"
                      >
                        <Users className="h-4 w-4" />
                        {t("reserve_btn")}
                      </Button>
                    )}
                    {r.status !== "declined" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDecline(r)}
                        disabled={busy}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        {t("decline_btn")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(r)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
