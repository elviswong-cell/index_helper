"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
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
import { createTask } from "@/lib/db";
import {
  TaskForm,
  emptyTaskForm,
  lessonsFromForm,
  type TaskFormValues,
} from "@/components/task-form";
import { useLang } from "@/lib/i18n";

export default function NewTaskPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const router = useRouter();

  async function handleCreate(values: TaskFormValues) {
    if (!user || !user.isAdmin) {
      toast("error", t("need_admin_permission"));
      return;
    }
    const { lessons, startAt, endAt } = lessonsFromForm(values);
    const deadline =
      values.deadlineDate && values.deadlineTime
        ? new Date(`${values.deadlineDate}T${values.deadlineTime}:00`)
        : undefined;
    const meetAt =
      values.meetUrl && values.meetDate && values.meetTime
        ? new Date(`${values.meetDate}T${values.meetTime}:00`)
        : undefined;

    try {
      const id = await createTask(
        {
          schoolName: values.schoolName,
          startAt,
          endAt,
          lessons,
          positions: { mt: values.mt, ta: values.ta },
          rates: { mt: values.mtRate, ta: values.taRate },
          rateUnit: values.rateUnit,
          ...(values.address ? { address: values.address } : {}),
          ...(values.mapUrl ? { mapUrl: values.mapUrl } : {}),
          ...(deadline ? { deadline: deadline as unknown as Date } : {}),
          ...(values.meetUrl ? { meetUrl: values.meetUrl } : {}),
          ...(meetAt ? { meetAt: meetAt as unknown as Date } : {}),
          ...(values.notes ? { notes: values.notes } : {}),
          status: "open",
          createdBy: user.uid,
        } as never,
        user.uid,
      );
      toast("success", t("job_created_toast"));
      router.push(`/admin/tasks/${id}`);
    } catch (err) {
      console.error(err);
      toast("error", t("job_create_failed"));
    }
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

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_admin")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            {t("create_job_title")}
          </CardTitle>
          <CardDescription>{t("create_job_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initial={emptyTaskForm}
            submitLabel={t("create_job_btn")}
            submittingLabel={t("creating")}
            onSubmit={handleCreate}
            onCancel={() => router.push("/admin")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
