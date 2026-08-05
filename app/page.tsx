"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Calendar, Clock, DollarSign, MapPin, Users } from "lucide-react";
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
import { listOpenTasks, toDate } from "@/lib/db";
import {
  formatDate,
  formatTimeRange,
  formatCurrency,
  durationHours,
} from "@/lib/utils";
import { rateFor, type Task } from "@/lib/types";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listOpenTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          INDEX ACADEMY 工作列表
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          瀏覽所有開放中的工作。報名前請先用 Google 登入，並在「設定」填寫電話號碼。
        </p>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border">
          <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h2 className="text-lg font-medium mb-1">目前沒有開放中的工作</h2>
          <p className="text-sm text-muted-foreground">請稍後再回來查看。</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {tasks.length} 個開放工作
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">
            {task.schoolName}
          </CardTitle>
          <Badge variant="success" className="shrink-0">
            開放
          </Badge>
        </div>
        <CardDescription className="space-y-1.5 pt-2">
          <span className="flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDate(start)}
          </span>
          <span className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {formatTimeRange(start, end)}（{hours} 小時）
          </span>
          {task.address && (
            <span className="flex items-start gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{task.address}</span>
            </span>
          )}
          <span className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            TA {formatCurrency(rateFor(task, "ta"))} · MT{" "}
            {formatCurrency(rateFor(task, "mt"))}／小時
          </span>
          <span className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 shrink-0" />
            TA {task.positions.ta} 名 · MT {task.positions.mt} 名
          </span>
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto pt-2">
        <Button asChild className="w-full">
          <Link href={`/tasks/${task.id}`}>查看並報名</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
