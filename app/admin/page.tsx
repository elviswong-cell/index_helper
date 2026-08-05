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
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import { TASK_STATUS_LABEL, rateFor } from "@/lib/types";
import type { Task } from "@/lib/types";

export default function AdminPage() {
  const { user, loading, configured } = useAuth();
  const { toast } = useToast();
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
      toast("error", "載入工作失敗");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  if (loading) {
    return <div className="text-muted-foreground">載入中...</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">需要登入</h2>
        <p className="text-sm text-muted-foreground mb-4">
          請先登入以存取管理後台
        </p>
        <Button asChild>
          <Link href="/login">前往登入</Link>
        </Button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">權限不足</h2>
        <p className="text-sm text-muted-foreground">
          你的帳號不是管理員，無法存取後台。若需管理員權限，請聯絡系統管理員把你的 UID 加入 <code>NEXT_PUBLIC_ADMIN_UIDS</code>。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">管理後台</h1>
          <p className="text-muted-foreground mt-1">
            建立、編輯、取消工作，並查看每個工作的報名名單
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? "重新整理中..." : "重新整理"}
          </Button>
          <Button asChild>
            <Link href="/admin/new" className="gap-2">
              <Plus className="h-4 w-4" />
              建立新工作
            </Link>
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border/60 bg-card/30">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">尚未建立任何工作</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            開始建立你的第一個工作
          </p>
          <Button asChild>
            <Link href="/admin/new" className="gap-2">
              <Plus className="h-4 w-4" />
              建立第一個工作
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
                    toast("success", "工作已取消");
                  } else if (action === "reopen") {
                    await reopenTask(task.id);
                    toast("success", "工作已重新開放");
                  } else if (action === "delete") {
                    if (!confirm("確定刪除此工作？此操作無法復原。")) return;
                    await deleteTask(task.id);
                    toast("success", "工作已刪除");
                  }
                  await refresh();
                } catch (err) {
                  console.error(err);
                  toast("error", "操作失敗");
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
  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);

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
            {TASK_STATUS_LABEL[task.status]}
          </Badge>
        </div>
        <CardDescription className="space-y-1.5 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(start)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {formatTimeRange(start, end)}（{hours} 小時）
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            TA {formatCurrency(rateFor(task, "ta"))} · MT {formatCurrency(rateFor(task, "mt"))}／小時
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            TA {task.positions.ta} · MT {task.positions.mt}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0" />
      <CardFooter className="mt-auto pt-4 flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href={`/admin/tasks/${task.id}`}>
            <Edit className="h-4 w-4" />
            管理報名
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
              取消工作
            </Button>
          ) : task.status === "cancelled" ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onAction("reopen")}
            >
              重新開放
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
