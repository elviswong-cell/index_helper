"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
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
import { listOpenTasks } from "@/lib/db";
import { toDate } from "@/lib/db";
import { formatDate, formatTimeRange, formatCurrency, durationHours } from "@/lib/utils";
import type { Task } from "@/lib/types";

export default function TasksPage() {
  const { user, configured } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
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
  }, [configured]);

  if (!configured) {
    return (
      <EmptyState
        icon={<Briefcase className="h-12 w-12" />}
        title="尚未設定 Firebase"
        description="請先設定 .env.local 才能瀏覽任務。"
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="h-12 w-12" />}
        title="目前沒有開放任務"
        description="管理員尚未建立任務，或所有任務都已截止。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">開放任務</h1>
          <p className="text-muted-foreground mt-1">
            瀏覽所有可報名的 Helper 任務
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {tasks.length} 個任務
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} signedIn={!!user} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, signedIn }: { task: Task; signedIn: boolean }) {
  const start = toDate(task.startAt);
  const end = toDate(task.endAt);
  const hours = durationHours(start, end);
  const totalSlots = task.positions.ta + task.positions.mt;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {task.schoolName}
          </CardTitle>
          <Badge variant="success" className="shrink-0">開放</Badge>
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
            {formatCurrency(task.hourlyRate)}／小時
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            TA {task.positions.ta} 名 · MT {task.positions.mt} 名（共 {totalSlots} 名）
          </div>
        </CardDescription>
      </CardHeader>
      {task.notes && (
        <CardContent className="text-xs text-muted-foreground line-clamp-2 pt-0">
          {task.notes}
        </CardContent>
      )}
      <CardFooter className="mt-auto pt-4">
        <Button asChild className="w-full">
          <Link href={`/tasks/${task.id}`}>
            {signedIn ? "查看並報名" : "查看詳情"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border/60 bg-card/30">
      <div className="text-muted-foreground/50 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
