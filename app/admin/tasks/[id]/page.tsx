"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  Trash2,
  Users,
  UserX,
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
  cancelTask,
  reopenTask,
} from "@/lib/db";
import { toDate } from "@/lib/db";
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import {
  POSITION_LABEL,
  REGISTRATION_STATUS_LABEL,
  rateFor,
  type Task,
  type Registration,
} from "@/lib/types";

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
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
      toast("error", "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRemove(reg: Registration) {
    if (!confirm(`確定移除 ${reg.userName} 的報名？`)) return;
    setBusy(true);
    try {
      await cancelRegistration(reg.id);
      toast("success", "已移除");
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", "移除失敗");
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
        toast("success", "工作已取消");
      } else if (task.status === "cancelled") {
        await reopenTask(task.id);
        toast("success", "工作已重新開放");
      }
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">載入中...</div>;
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">找不到此工作</h2>
        <Button asChild variant="outline">
          <Link href="/admin">返回後台</Link>
        </Button>
      </div>
    );
  }

  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);
  const confirmedTa = regs.filter((r) => r.position === "ta" && r.status === "confirmed").length;
  const confirmedMt = regs.filter((r) => r.position === "mt" && r.status === "confirmed").length;

  const sortedRegs = [...regs].sort((a, b) => {
    if (a.status !== b.status) return a.status === "confirmed" ? -1 : 1;
    return 0;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          返回後台
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
                  {task.status === "open" ? "開放報名" : task.status === "cancelled" ? "已取消" : "已截止"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={toggleStatus} disabled={busy}>
              {task.status === "open"
                ? "取消工作"
                : task.status === "cancelled"
                  ? "重新開放"
                  : "無操作"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">日期</p>
                <p className="font-medium">{formatDate(start)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">時間</p>
                <p className="font-medium">{formatTimeRange(start, end)}（{hours} 小時）</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">時薪</p>
                <p className="font-medium">
                  TA {formatCurrency(rateFor(task, "ta"))} · MT {formatCurrency(rateFor(task, "mt"))}／小時
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">已確認名額</p>
                <p className="font-medium">
                  TA {confirmedTa}/{task.positions.ta} · MT {confirmedMt}/{task.positions.mt}
                </p>
              </div>
            </div>
          </div>
          {task.notes && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">備註</p>
              <p className="whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>報名名單</CardTitle>
          <CardDescription>
            共 {regs.length} 人報名（{confirmedTa + confirmedMt} 已確認 /{" "}
            {regs.length - (confirmedTa + confirmedMt)} 後備）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              目前沒有人報名
            </p>
          ) : (
            <div className="space-y-2">
              {sortedRegs.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                    r.status === "waitlist"
                      ? "border-border/60 bg-muted/20 opacity-70"
                      : "border-border/60 bg-card"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.userName}</span>
                      <Badge
                        variant={r.status === "confirmed" ? "success" : "muted"}
                        className={r.status === "waitlist" ? "grayscale" : ""}
                      >
                        {POSITION_LABEL[r.position]} · {REGISTRATION_STATUS_LABEL[r.status]}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
