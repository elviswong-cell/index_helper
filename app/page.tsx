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
  formatDateRange,
  formatTimeRange,
  formatCurrency,
  durationHours,
  roundHours,
} from "@/lib/utils";
import {
  lessonsOf,
  rateFor,
  rateUnitFor,
  RATE_UNIT_LABEL,
  type Task,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useLang();
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
          {t("home_title")}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t("home_subtitle")}
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
          <h2 className="text-lg font-medium mb-1">{t("no_open_jobs_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("no_open_jobs_desc")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tasks.length} {t("jobs_count")}
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
  const { t } = useLang();
  const lessons = lessonsOf(task);
  const multi = lessons.length > 1;
  const start = toDate(lessons[0].startAt);
  const end = toDate(lessons[lessons.length - 1].endAt);
  const hours = roundHours(
    lessons.reduce(
      (sum, l) => sum + durationHours(toDate(l.startAt), toDate(l.endAt)),
      0,
    ),
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug line-clamp-2">
            {task.schoolName}
          </CardTitle>
          <Badge variant="success" className="shrink-0">
            {t("open")}
          </Badge>
        </div>
        <CardDescription className="space-y-1.5 pt-2">
          <span className="flex items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDateRange(start, end)}
          </span>
          <span className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {multi
              ? `${lessons.length} ${t("lessons_count_suffix")} · ${hours} ${t("hours_suffix")} ${t("total_suffix")}`
              : `${formatTimeRange(start, end)} (${hours} ${t("hours_suffix")})`}
          </span>
          {task.address && (
            <span className="flex items-start gap-2 text-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{task.address}</span>
            </span>
          )}
          <span className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            MT {formatCurrency(rateFor(task, "mt"))} · TA{" "}
            {formatCurrency(rateFor(task, "ta"))}
            {RATE_UNIT_LABEL[rateUnitFor(task)]}
          </span>
          <span className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 shrink-0" />
            MT {task.positions.mt} {t("slots_suffix")} · TA {task.positions.ta}{" "}
            {t("slots_suffix")}
            {multi && ` (${t("per_lesson")})`}
          </span>
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto pt-2">
        <Button asChild className="w-full">
          <Link href={`/tasks/${task.id}`}>{t("view_and_apply")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
