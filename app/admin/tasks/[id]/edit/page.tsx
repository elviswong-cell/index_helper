"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import { getTask, updateTask, toDate } from "@/lib/db";
import { rateFor, rateUnitFor, type Task } from "@/lib/types";
import { TaskForm, emptyTaskForm, type TaskFormValues } from "@/components/task-form";
import { useLang } from "@/lib/i18n";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}
function toTimeInput(d: Date | null): string {
  if (!d) return "";
  return d.toTimeString().slice(0, 5);
}

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const t = await getTask(id);
        setTask(t);
      } catch (err) {
        console.error(err);
        toast("error", t("load_failed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpdate(values: TaskFormValues) {
    if (!user?.isAdmin || !task) return;
    const start = new Date(`${values.date}T${values.startTime}:00`);
    const end = new Date(`${values.date}T${values.endTime}:00`);
    const deadline =
      values.deadlineDate && values.deadlineTime
        ? new Date(`${values.deadlineDate}T${values.deadlineTime}:00`)
        : undefined;
    const meetAt =
      values.meetUrl && values.meetDate && values.meetTime
        ? new Date(`${values.meetDate}T${values.meetTime}:00`)
        : undefined;

    try {
      await updateTask(task.id, {
        schoolName: values.schoolName,
        startAt: start as unknown as Date,
        endAt: end as unknown as Date,
        positions: { mt: values.mt, ta: values.ta },
        rates: { mt: values.mtRate, ta: values.taRate },
        rateUnit: values.rateUnit,
        ...(values.address ? { address: values.address } : {}),
        ...(values.mapUrl ? { mapUrl: values.mapUrl } : {}),
        ...(deadline ? { deadline: deadline as unknown as Date } : {}),
        ...(values.meetUrl ? { meetUrl: values.meetUrl } : {}),
        ...(meetAt ? { meetAt: meetAt as unknown as Date } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      });
      toast("success", t("job_updated_toast"));
      router.push(`/admin/tasks/${task.id}`);
    } catch (err) {
      console.error(err);
      toast("error", t("job_update_failed"));
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("need_admin_permission")}
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <div className="rounded-[20px] glass p-8 text-center">
        <h2 className="text-lg font-medium mb-2">{t("job_not_found_admin")}</h2>
        <Button asChild variant="outline">
          <Link href="/admin">{t("back_to_admin")}</Link>
        </Button>
      </div>
    );
  }

  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const deadline = toDate(task.deadline ?? null);
  const meetAt = toDate(task.meetAt ?? null);

  const initial: TaskFormValues = {
    ...emptyTaskForm,
    schoolName: task.schoolName,
    address: task.address ?? "",
    mapUrl: task.mapUrl ?? "",
    date: toDateInput(start),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
    mt: task.positions.mt,
    ta: task.positions.ta,
    mtRate: rateFor(task, "mt"),
    taRate: rateFor(task, "ta"),
    rateUnit: rateUnitFor(task),
    deadlineDate: toDateInput(deadline),
    deadlineTime: toTimeInput(deadline),
    meetUrl: task.meetUrl ?? "",
    meetDate: toDateInput(meetAt),
    meetTime: toTimeInput(meetAt),
    notes: task.notes ?? "",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href={`/admin/tasks/${task.id}`}>
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_job_detail")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pencil className="h-5 w-5" />
            {t("edit_job_title")}
          </CardTitle>
          <CardDescription>{t("edit_job_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initial={initial}
            submitLabel={t("save_changes")}
            submittingLabel={t("saving_short")}
            onSubmit={handleUpdate}
            onCancel={() => router.push(`/admin/tasks/${task.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
