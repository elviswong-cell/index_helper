"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Search,
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
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  listAllRegistrations,
  listAllTasks,
  listUserProfiles,
  toDate,
} from "@/lib/db";
import { formatCurrency, formatMonth } from "@/lib/utils";
import {
  isProfileComplete,
  lessonAmount,
  lessonStatusFor,
  lessonsFor,
  monthKey,
  type Registration,
  type Task,
  type UserProfile,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

export interface TutorRow {
  profile: UserProfile;
  /** Confirmed lessons, filtered by the selected month. */
  lessonCount: number;
  /** Confirmed lessons that have already finished. */
  completedCount: number;
  earnings: number;
}

export default function AdminTutorsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLang();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      const [p, r, tk] = await Promise.all([
        listUserProfiles(),
        listAllRegistrations(),
        listAllTasks(),
      ]);
      setProfiles(p);
      setRegs(r);
      setTasks(tk);
    } catch (err) {
      console.error(err);
      toast("error", t("load_failed_generic"));
    } finally {
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.isAdmin) refresh();
    else setFetching(false);
  }, [user, refresh]);

  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  /** Every month that has at least one confirmed lesson, newest first. */
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const reg of regs) {
      const task = tasksById.get(reg.taskId);
      if (!task) continue;
      for (const lesson of lessonsFor(reg, task)) {
        if (lessonStatusFor(reg, lesson.id) === "confirmed") {
          set.add(monthKey(lesson.startAt));
        }
      }
    }
    return Array.from(set).sort().reverse();
  }, [regs, tasksById]);

  const rows: TutorRow[] = useMemo(() => {
    const now = Date.now();
    const byUser = new Map<string, { count: number; done: number; earned: number }>();

    for (const reg of regs) {
      const task = tasksById.get(reg.taskId);
      if (!task) continue;
      for (const lesson of lessonsFor(reg, task)) {
        if (lessonStatusFor(reg, lesson.id) !== "confirmed") continue;
        if (month !== "all" && monthKey(lesson.startAt) !== month) continue;

        const entry = byUser.get(reg.userId) ?? { count: 0, done: 0, earned: 0 };
        entry.count += 1;
        const end = toDate(lesson.endAt);
        if (end && end.getTime() <= now) {
          entry.done += 1;
          entry.earned += lessonAmount(task, lesson, reg.position);
        }
        byUser.set(reg.userId, entry);
      }
    }

    // Anyone who has worked but never saved a profile still needs a row.
    const known = new Map(profiles.map((p) => [p.uid, p]));
    for (const reg of regs) {
      if (!known.has(reg.userId)) {
        known.set(reg.userId, {
          uid: reg.userId,
          phone: reg.userPhone,
          displayName: reg.userName,
          email: reg.userEmail,
        });
      }
    }

    return Array.from(known.values())
      .map((profile) => {
        const s = byUser.get(profile.uid) ?? { count: 0, done: 0, earned: 0 };
        return {
          profile,
          lessonCount: s.count,
          completedCount: s.done,
          earnings: Math.round(s.earned * 100) / 100,
        };
      })
      .sort((a, b) => b.lessonCount - a.lessonCount);
  }, [regs, tasksById, profiles, month]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.profile.displayName, r.profile.email, r.profile.phone]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  if (loading || fetching) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("admin_denied_desc")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_admin")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {t("tutors_title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("tutors_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            {filtered.length} {t("tutors_count")}
          </CardTitle>
          <CardDescription>{t("tutors_filter_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("tutors_search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("filter_month")}:</span>
            <button
              type="button"
              onClick={() => setMonth("all")}
              className={`press rounded-full border px-3 py-1 text-sm transition-colors ${
                month === "all"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-white/60 text-muted-foreground"
              }`}
            >
              {t("filter_all")}
            </button>
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(m)}
                className={`press rounded-full border px-3 py-1 text-sm transition-colors ${
                  month === m
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white/60 text-muted-foreground"
                }`}
              >
                {formatMonth(m, lang)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("no_tutors")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-white/60 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">{t("th_name")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("th_contact")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("th_scrc")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("th_bank")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("th_lessons")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("th_earned")}</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.profile.uid} className="border-t border-border/70 align-top">
                      <td className="px-3 py-2.5">
                        <span className="font-medium">
                          {row.profile.displayName || t("anonymous")}
                        </span>
                        {!isProfileComplete(row.profile) && (
                          <Badge variant="warning" className="ml-2 text-[10px]">
                            {t("profile_incomplete_badge")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {row.profile.email || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />
                          {row.profile.phone || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {row.profile.scrcUrl ? (
                          <a
                            href={row.profile.scrcUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {t("view")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-destructive">{t("missing")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {row.profile.bankName ? (
                          <>
                            <span className="block">{row.profile.bankName}</span>
                            <span className="block">{row.profile.bankAccount}</span>
                            <span className="block">{row.profile.bankAccountName}</span>
                          </>
                        ) : (
                          <span className="text-destructive">{t("missing")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className="font-medium">{row.lessonCount}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.completedCount} {t("completed_suffix")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-medium">
                        {formatCurrency(row.earnings)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/tutors/${row.profile.uid}`}>
                            {t("view_detail")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
