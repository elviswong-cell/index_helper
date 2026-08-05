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
  cancelTask,
  reopenTask,
  toDate,
} from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/mail";
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import {
  POSITION_LABEL,
  REGISTRATION_STATUS_LABEL,
  RATE_UNIT_LABEL,
  rateFor,
  rateUnitFor,
  type Task,
  type Registration,
} from "@/lib/types";

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
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

  async function handleConfirm(reg: Registration) {
    if (!task) return;
    setBusy(true);
    try {
      await confirmRegistration(reg, task);
      toast("success", `已確認 ${reg.userName}`);
      await refresh();
      try {
        await sendConfirmationEmail(reg, task.schoolName);
      } catch (mailErr) {
        console.error(mailErr);
        toast("error", "已確認，但確認郵件寄送失敗，請自行聯絡對方");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "確認失敗";
      toast("error", msg);
    } finally {
      setBusy(false);
    }
  }

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
      <div className="rounded-[20px] glass p-8 text-center">
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
  const confirmedMt = regs.filter((r) => r.position === "mt" && r.status === "confirmed").length;
  const confirmedTa = regs.filter((r) => r.position === "ta" && r.status === "confirmed").length;
  const unit = rateUnitFor(task);

  const sortedRegs = [...regs].sort((a, b) => {
    if (a.status !== b.status) return a.status === "waitlist" ? -1 : 1;
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
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/admin/tasks/${task.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  編輯
                </Link>
              </Button>
              <Button variant="outline" onClick={toggleStatus} disabled={busy}>
                {task.status === "open"
                  ? "取消工作"
                  : task.status === "cancelled"
                    ? "重新開放"
                    : "無操作"}
              </Button>
            </div>
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
                <p className="text-xs text-muted-foreground">薪酬</p>
                <p className="font-medium">
                  MT {formatCurrency(rateFor(task, "mt"))} · TA {formatCurrency(rateFor(task, "ta"))}
                  {RATE_UNIT_LABEL[unit]}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">已確認名額</p>
                <p className="font-medium">
                  MT {confirmedMt}/{task.positions.mt} · TA {confirmedTa}/{task.positions.ta}
                </p>
              </div>
            </div>
          </div>
          {task.notes && (
            <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 p-3 text-sm">
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
            共 {regs.length} 人報名（{confirmedMt + confirmedTa} 已確認 /{" "}
            {regs.length - (confirmedMt + confirmedTa)} 待審核）
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
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                    r.status === "waitlist"
                      ? "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5"
                      : "border-white/60 bg-white/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.userName}</span>
                      <Badge variant={r.status === "confirmed" ? "success" : "warning"}>
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
                  <div className="flex items-center gap-1">
                    {r.status === "waitlist" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(r)}
                        disabled={busy}
                        className="text-[hsl(var(--success))] hover:text-[hsl(var(--success))] gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        確認
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
