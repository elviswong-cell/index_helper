"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  Edit,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import { listAllTasks, cancelTask, reopenTask, deleteTask } from "@/lib/db";
import { toDate } from "@/lib/db";
import {
  formatDateRange,
  formatTimeRange,
  formatCurrency,
  durationHours,
  roundHours,
} from "@/lib/utils";
import { RATE_UNIT_LABEL, lessonsOf, rateFor, rateUnitFor } from "@/lib/types";
import type { Task } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function AdminPage() {
  const { user, loading, configured } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!configured) return;
    setRefreshing(true);
    try {
      const data = await listAllTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
      toast("error", t("admin_load_failed"));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  if (loading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user) {
    return (
      <div className="rounded-[20px] glass p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("admin_need_login_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("admin_need_login_desc")}</p>
        <Button asChild>
          <Link href="/login">{t("google_login")}</Link>
        </Button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="rounded-[20px] border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("admin_denied_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin_denied_desc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? t("refreshing") : t("refresh")}
          </Button>
          <Button asChild>
            <Link href="/admin/new" className="gap-2">
              <Plus className="h-4 w-4" />
              {t("new_job")}
            </Link>
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-[20px] glass">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">{t("admin_no_jobs_title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">{t("admin_no_jobs_desc")}</p>
          <Button asChild>
            <Link href="/admin/new" className="gap-2">
              <Plus className="h-4 w-4" />
              {t("admin_create_first_job")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <AdminTaskCard
              key={task.id}
              task={task}
              onAction={async (action) => {
                try {
                  if (action === "cancel") {
                    await cancelTask(task.id);
                    toast("success", t("job_cancelled_toast"));
                  } else if (action === "reopen") {
                    await reopenTask(task.id);
                    toast("success", t("job_reopened_toast"));
                  } else if (action === "delete") {
                    if (!confirm(t("confirm_delete_job"))) return;
                    await deleteTask(task.id);
                    toast("success", t("job_deleted_toast"));
                  }
                  await refresh();
                } catch (err) {
                  console.error(err);
                  toast("error", t("job_status_update_failed"));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminTaskCard({
  task,
  onAction,
}: {
  task: Task;
  onAction: (action: "cancel" | "reopen" | "delete") => Promise<void>;
}) {
  const { t } = useLang();
  const lessons = lessonsOf(task);
  const multi = lessons.length > 1;
  const start = toDate(lessons[0].startAt);
  const end = toDate(lessons[lessons.length - 1].endAt);
  const hours = roundHours(
    lessons.reduce(
      (sum, l) => sum + durationHours(toDate(l.startAt), toDate(l.endAt)),
      0,
    ),
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {task.schoolName}
          </CardTitle>
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
        <CardDescription className="space-y-1.5 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateRange(start, end)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {multi
              ? `${lessons.length} ${t("lessons_count_suffix")} · ${hours} ${t("hours_suffix")} ${t("total_suffix")}`
              : `${formatTimeRange(start, end)} (${hours} ${t("hours_suffix")})`}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            MT {formatCurrency(rateFor(task, "mt"))} · TA {formatCurrency(rateFor(task, "ta"))}
            {RATE_UNIT_LABEL[rateUnitFor(task)]}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            MT {task.positions.mt} · TA {task.positions.ta}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0" />
      <CardFooter className="mt-auto pt-4 flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href={`/admin/tasks/${task.id}`}>
            <Edit className="h-4 w-4" />
            {t("manage_registrations")}
          </Link>
        </Button>
        <div className="flex gap-2">
          {task.status === "open" ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onAction("cancel")}
            >
              {t("cancel_job")}
            </Button>
          ) : task.status === "cancelled" ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onAction("reopen")}
            >
              {t("reopen_job")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onAction("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
