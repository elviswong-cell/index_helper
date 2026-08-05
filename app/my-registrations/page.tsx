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
  POSITION_LABEL,
  REGISTRATION_STATUS_LABEL,
  rateFor,
  type Registration,
  type Task,
} from "@/lib/types";

interface JoinedReg extends Registration {
  task: Task | null;
}

export default function MyRegistrationsPage() {
  const { user, loading, configured } = useAuth();
  const { toast } = useToast();
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
      toast("error", "載入報名失敗");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return <div className="text-muted-foreground">載入中...</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">需要登入</h2>
        <p className="text-sm text-muted-foreground mb-4">
          登入後即可查看你已報名的工作
        </p>
        <Button asChild>
          <Link href="/">回到工作列表</Link>
        </Button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">尚未設定 Firebase</h2>
        <p className="text-sm text-muted-foreground">
          請先設定 .env.local 才能查看報名
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的報名</h1>
          <p className="text-muted-foreground mt-1">
            所有你已報名的工作 — 已確認與待審核
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "重新整理"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border/60 bg-card/30">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">尚未報名任何工作</h3>
          <p className="text-sm text-muted-foreground mb-4">
            到工作列表找一個你感興趣的工作
          </p>
          <Button asChild>
            <Link href="/">瀏覽工作</Link>
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
                  toast("success", "已取消報名");
                  await refresh();
                } catch (err) {
                  console.error(err);
                  toast("error", "取消失敗");
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
  const task = reg.task;
  const start = task ? toDate(task.startAt) : null;
  const end = task ? toDate(task.endAt) : null;
  const isWaitlist = reg.status === "waitlist";

  return (
    <Card className={isWaitlist ? "opacity-70" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {task?.schoolName ?? "（工作已刪除）"}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant={isWaitlist ? "muted" : "success"}
                className={isWaitlist ? "grayscale" : ""}
              >
                {POSITION_LABEL[reg.position]} · {REGISTRATION_STATUS_LABEL[reg.status]}
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
            取消報名
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
            {formatTimeRange(start, end)}（{durationHours(start, end)} 小時）
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {formatCurrency(rateFor(task, reg.position))}／小時（{POSITION_LABEL[reg.position]}）
          </div>
        </CardContent>
      )}
    </Card>
  );
}
