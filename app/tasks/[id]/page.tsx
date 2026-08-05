"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Users,
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  getTask,
  registerForTask,
  countConfirmed,
  listRegistrationsForTask,
  cancelRegistration,
} from "@/lib/db";
import { toDate } from "@/lib/db";
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import {
  POSITION_LABEL,
  type Position,
  type Task,
  type Registration,
} from "@/lib/types";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, configured } = useAuth();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [taCount, setTaCount] = useState(0);
  const [mtCount, setMtCount] = useState(0);
  const [myReg, setMyReg] = useState<Registration | null>(null);
  const [position, setPosition] = useState<Position>("ta");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const t = await getTask(id);
      setTask(t);
      if (t) {
        const [ta, mt, regs] = await Promise.all([
          countConfirmed(t.id, "ta"),
          countConfirmed(t.id, "mt"),
          listRegistrationsForTask(t.id),
        ]);
        setTaCount(ta);
        setMtCount(mt);
        if (user) {
          setMyReg(regs.find((r) => r.userId === user.uid) ?? null);
        }
      }
    } catch (err) {
      console.error(err);
      toast("error", "載入任務失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  async function handleRegister() {
    if (!user || !task) return;
    setSubmitting(true);
    try {
      const res = await registerForTask({
        taskId: task.id,
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? user.email ?? "匿名",
        position,
      });
      toast(
        res.status === "confirmed" ? "success" : "info",
        res.status === "confirmed"
          ? "報名成功 — 已確認"
          : "此職位已額滿，你已加入後備名單",
      );
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "報名失敗";
      toast("error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!myReg) return;
    try {
      await cancelRegistration(myReg.id);
      toast("success", "已取消報名");
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", "取消失敗");
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">載入中...</div>;
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">找不到此任務</h2>
        <Button asChild variant="outline">
          <Link href="/tasks">回到任務列表</Link>
        </Button>
      </div>
    );
  }

  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);
  const isOpen = task.status === "open";

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/tasks">
          <ArrowLeft className="h-4 w-4" />
          返回任務列表
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{task.schoolName}</CardTitle>
              <Badge
                variant={
                  isOpen ? "success" : task.status === "cancelled" ? "destructive" : "muted"
                }
              >
                {isOpen ? "開放報名" : task.status === "cancelled" ? "已取消" : "已截止"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="日期">
              {formatDate(start)}
            </InfoRow>
            <InfoRow icon={<Clock className="h-4 w-4" />} label="時間">
              {formatTimeRange(start, end)}（{hours} 小時）
            </InfoRow>
            <InfoRow icon={<DollarSign className="h-4 w-4" />} label="時薪">
              {formatCurrency(task.hourlyRate)}／小時
            </InfoRow>
            <InfoRow icon={<Users className="h-4 w-4" />} label="名額">
              TA {taCount}/{task.positions.ta} · MT {mtCount}/{task.positions.mt}
            </InfoRow>
          </div>

          {task.notes && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-1">備註</p>
              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {/* Registration */}
          {isOpen && (
            <div className="border-t border-border/60 pt-6 space-y-4">
              {myReg ? (
                <div className="rounded-lg border border-success/40 bg-success/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">
                      你已報名 {POSITION_LABEL[myReg.position]} — {myReg.status === "confirmed" ? "已確認" : "後備"}
                    </span>
                  </div>
                  <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                    取消報名
                  </Button>
                </div>
              ) : user ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>選擇職位</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <PositionOption
                        value="ta"
                        label="TA 助教"
                        current={taCount}
                        total={task.positions.ta}
                        selected={position === "ta"}
                        onSelect={() => setPosition("ta")}
                      />
                      <PositionOption
                        value="mt"
                        label="MT 主導師"
                        current={mtCount}
                        total={task.positions.mt}
                        selected={position === "mt"}
                        onSelect={() => setPosition("mt")}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleRegister}
                    disabled={submitting || !configured}
                    className="w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        報名中...
                      </>
                    ) : (
                      "確認報名"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    若該職位名額已滿，系統會自動將你加入後備名單（灰色標示）。
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    請先登入以報名任務
                  </p>
                  <Button asChild>
                    <Link href="/login">前往登入</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{children}</p>
      </div>
    </div>
  );
}

function PositionOption({
  value,
  label,
  current,
  total,
  selected,
  onSelect,
}: {
  value: Position;
  label: string;
  current: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const full = current >= total;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-lg border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary/50"
          : "border-border/60 hover:border-primary/40"
      } ${full ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        {full && <Badge variant="muted" className="text-[10px]">已額滿</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        已確認 {current} / {total} 名
      </p>
    </button>
  );
}
