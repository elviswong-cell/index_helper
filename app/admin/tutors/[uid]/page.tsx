"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Trash2,
  UserCog,
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  deleteUserProfile,
  getUserProfile,
  listAllInvoices,
  listAllTasks,
  listRegistrationsForUser,
  saveUserProfile,
  toDate,
} from "@/lib/db";
import { deleteScrc } from "@/lib/storage";
import {
  formatCurrency,
  formatDateShort,
  formatMonth,
  formatTimeRange,
} from "@/lib/utils";
import {
  lessonAmount,
  lessonStatusFor,
  lessonsFor,
  monthKey,
  type Invoice,
  type Registration,
  type Task,
  type UserProfile,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

interface WorkedLesson {
  key: string;
  month: string;
  schoolName: string;
  lessonTitle: string;
  position: string;
  startAt: Date | null;
  endAt: Date | null;
  amount: number;
  completed: boolean;
}

export default function AdminTutorDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLang();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lessons, setLessons] = useState<WorkedLesson[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState("all");

  // Editable copy of the profile.
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
  });

  const refresh = useCallback(async () => {
    if (!uid) return;
    setFetching(true);
    try {
      const [p, regs, tasks, allInvoices] = await Promise.all([
        getUserProfile(uid),
        listRegistrationsForUser(uid),
        listAllTasks(),
        listAllInvoices(),
      ]);
      setProfile(p);
      setForm({
        displayName: p?.displayName ?? "",
        email: p?.email ?? "",
        phone: p?.phone ?? "",
        bankName: p?.bankName ?? "",
        bankAccount: p?.bankAccount ?? "",
        bankAccountName: p?.bankAccountName ?? "",
      });
      setInvoices(allInvoices.filter((i) => i.userId === uid));

      const byId = new Map(tasks.map((task) => [task.id, task]));
      const now = Date.now();
      const rows: WorkedLesson[] = [];
      for (const reg of regs) {
        const task = byId.get(reg.taskId);
        if (!task) continue;
        for (const lesson of lessonsFor(reg, task)) {
          if (lessonStatusFor(reg, lesson.id) !== "confirmed") continue;
          const end = toDate(lesson.endAt);
          rows.push({
            key: `${task.id}::${lesson.id}`,
            month: monthKey(lesson.startAt),
            schoolName: task.schoolName,
            lessonTitle: lesson.title ?? "",
            position: reg.position,
            startAt: toDate(lesson.startAt),
            endAt: end,
            amount: lessonAmount(task, lesson, reg.position),
            completed: !!end && end.getTime() <= now,
          });
        }
      }
      rows.sort((a, b) => (b.startAt?.getTime() ?? 0) - (a.startAt?.getTime() ?? 0));
      setLessons(rows);
    } catch (err) {
      console.error(err);
      toast("error", t("load_failed_generic"));
    } finally {
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (user?.isAdmin) refresh();
    else if (!loading) setFetching(false);
  }, [user, loading, refresh]);

  const months = useMemo(
    () => Array.from(new Set(lessons.map((l) => l.month))).sort().reverse(),
    [lessons],
  );
  const shown = lessons.filter((l) => month === "all" || l.month === month);
  const shownTotal = shown
    .filter((l) => l.completed)
    .reduce((sum, l) => sum + l.amount, 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setBusy(true);
    try {
      await saveUserProfile(uid, {
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        bankName: form.bankName.trim(),
        bankAccount: form.bankAccount.trim(),
        bankAccountName: form.bankAccountName.trim(),
      });
      toast("success", t("profile_saved"));
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", t("save_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!uid) return;
    if (!confirm(t("tutor_delete_confirm"))) return;
    setBusy(true);
    try {
      await deleteScrc(uid);
      await deleteUserProfile(uid);
      toast("success", t("tutor_deleted"));
      router.push("/admin/tutors");
    } catch (err) {
      console.error(err);
      toast("error", t("remove_failed"));
    } finally {
      setBusy(false);
    }
  }

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
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin/tutors">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_tutors")}
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.displayName || form.displayName || t("anonymous")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lessons.length} {t("confirmed_lessons_total")} ·{" "}
            {lessons.filter((l) => l.completed).length} {t("completed_suffix")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={busy}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t("delete_account_data")}
        </Button>
      </div>

      {/* SCRC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            {t("scrc_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.scrcUrl ? (
            <a
              href={profile.scrcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm"
            >
              {t("scrc_view_document")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="text-sm text-destructive">{t("scrc_none")}</p>
          )}
        </CardContent>
      </Card>

      {/* Editable profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="h-5 w-5" />
            {t("edit_tutor_data")}
          </CardTitle>
          <CardDescription>{t("edit_tutor_data_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                id="displayName"
                label={t("name_label")}
                value={form.displayName}
                onChange={(v) => setForm({ ...form, displayName: v })}
              />
              <Field
                id="email"
                label={t("email_label")}
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                id="phone"
                label={t("contact_phone_title")}
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <Field
                id="bankName"
                label={t("field_bankName")}
                value={form.bankName}
                onChange={(v) => setForm({ ...form, bankName: v })}
              />
              <Field
                id="bankAccount"
                label={t("field_bankAccount")}
                value={form.bankAccount}
                onChange={(v) => setForm({ ...form, bankAccount: v })}
              />
              <Field
                id="bankAccountName"
                label={t("field_bankAccountName")}
                value={form.bankAccountName}
                onChange={(v) => setForm({ ...form, bankAccountName: v })}
              />
            </div>
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("save_changes")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lesson history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("lesson_history")}</CardTitle>
          <CardDescription>{t("lesson_history_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("no_lessons_for_filter")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-white/60 text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_school")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_role")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("th_price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((l) => (
                      <tr key={l.key} className="border-t border-border/70">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {formatDateShort(l.startAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          {l.schoolName}
                          {l.lessonTitle && (
                            <span className="block text-xs text-muted-foreground">
                              {l.lessonTitle}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatTimeRange(l.startAt, l.endAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={l.completed ? "success" : "muted"}>
                            {t(l.position === "mt" ? "pos_mt" : "pos_ta")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {l.completed ? (
                            formatCurrency(l.amount)
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("upcoming")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-right text-sm">
                <span className="text-muted-foreground">{t("completed_total")}: </span>
                <span className="font-semibold">{formatCurrency(shownTotal)}</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("invoice_history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("no_invoices")}
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {formatMonth(inv.month, lang)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                    <span className="text-xs text-muted-foreground">
                      {inv.items.length} {t("lessons_count_suffix")}
                    </span>
                  </div>
                  <span className="font-medium text-sm">{formatCurrency(inv.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
