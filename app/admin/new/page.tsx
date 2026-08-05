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
import { TaskForm, emptyTaskForm, type TaskFormValues } from "@/components/task-form";

export default function NewTaskPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  async function handleCreate(values: TaskFormValues) {
    if (!user || !user.isAdmin) {
      toast("error", "需要管理員權限");
      return;
    }
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
      const id = await createTask(
        {
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
          status: "open",
          createdBy: user.uid,
        } as never,
        user.uid,
      );
      toast("success", "工作已建立");
      router.push(`/admin/tasks/${id}`);
    } catch (err) {
      console.error(err);
      toast("error", "建立失敗");
    }
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          需要管理員權限才能建立工作
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          返回後台
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            建立新工作
          </CardTitle>
          <CardDescription>填寫以下資訊以建立一個新的工作</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initial={emptyTaskForm}
            submitLabel="建立工作"
            submittingLabel="建立中..."
            onSubmit={handleCreate}
            onCancel={() => router.push("/admin")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
