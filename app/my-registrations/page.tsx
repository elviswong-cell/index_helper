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
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import {
  RATE_UNIT_LABEL,
  rateFor,
  rateUnitFor,
  type Registration,
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

function Row({ reg, onCancel }: { reg: JoinedReg; onCancel: () => void }) {
  const { t } = useLang();
  const task = reg.task;
  const start = task ? toDate(task.startAt) : null;
  const end = task ? toDate(task.endAt) : null;
  const isConfirmed = reg.status === "confirmed";
  const isDeclined = reg.status === "declined";

  const statusKey =
    reg.status === "confirmed"
      ? "status_confirmed"
      : reg.status === "declined"
        ? "status_declined"
        : reg.status === "reserve"
          ? "status_reserve"
          : "status_pending";
  const badgeVariant = isConfirmed
    ? "success"
    : isDeclined
      ? "destructive"
      : "warning";

  return (
    <Card className={!isConfirmed ? "opacity-80" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {task?.schoolName ?? t("deleted_job")}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={badgeVariant}>
                {t(reg.position === "mt" ? "pos_mt" : "pos_ta")} · {t(statusKey)}
              </Badge>
              <span className="text-xs">·</span>
              <span className="text-xs text-muted-foreground">{reg.userEmail}</span>
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
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(start)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTimeRange(start, end)} ({durationHours(start, end)} {t("hours_suffix")})
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(rateFor(task, reg.position))}{RATE_UNIT_LABEL[rateUnitFor(task)]} ({t(reg.position === "mt" ? "pos_mt" : "pos_ta")})
          </div>
        </CardContent>
      )}
    </Card>
  );
}
