"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Receipt,
  Send,
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
  getUserProfile,
  invoicedKeys,
  listInvoicesForUser,
  listRegistrationsForUser,
  submitInvoice,
  toDate,
} from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/mail";
import {
  buildInvoicePdfBase64,
  downloadInvoicePdf,
  draftFromInvoice,
  invoiceFileName,
  type InvoiceDraft,
} from "@/lib/invoice-pdf";
import {
  formatCurrency,
  formatDateShort,
  formatMonth,
  formatTimeRange,
} from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import {
  INVOICE_CUTOFF_DAY,
  billableLessons,
  buildInvoiceItem,
  itemKey,
  missingProfileFields,
  monthKey,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type UserProfile,
} from "@/lib/types";
import { useLang } from "@/lib/i18n";

interface Billable {
  key: string;
  item: InvoiceItem;
  month: string;
  invoiced: boolean;
}

export default function InvoicesPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLang();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [billables, setBillables] = useState<Billable[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [month, setMonth] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const [regs, invs, prof] = await Promise.all([
        listRegistrationsForUser(user.uid),
        listInvoicesForUser(user.uid),
        getUserProfile(user.uid),
      ]);
      setProfile(prof);
      setInvoices(invs);

      const billed = invoicedKeys(invs);
      const tasks = await Promise.all(
        Array.from(new Set(regs.map((r) => r.taskId))).map((id) =>
          getTask(id).catch(() => null),
        ),
      );
      const byId = new Map(tasks.filter(Boolean).map((task) => [task!.id, task!]));

      const rows: Billable[] = [];
      for (const reg of regs) {
        const task = byId.get(reg.taskId);
        if (!task) continue;
        for (const lesson of billableLessons(reg, task)) {
          const key = itemKey(task.id, lesson.id);
          rows.push({
            key,
            item: buildInvoiceItem(task, lesson, reg.position),
            month: monthKey(lesson.startAt),
            invoiced: billed.has(key),
          });
        }
      }
      rows.sort(
        (a, b) =>
          (toDate(a.item.startAt)?.getTime() ?? 0) -
          (toDate(b.item.startAt)?.getTime() ?? 0),
      );
      setBillables(rows);
    } catch (err) {
      console.error(err);
      toast("error", t("load_failed_generic"));
    } finally {
      setFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const months = useMemo(
    () => Array.from(new Set(billables.map((b) => b.month))).sort().reverse(),
    [billables],
  );

  // Default to the most recent month with completed work, and pre-tick
  // everything not already invoiced — the house rule is one invoice a month.
  useEffect(() => {
    if (!month && months.length > 0) setMonth(months[0]);
  }, [months, month]);

  const monthRows = useMemo(
    () => billables.filter((b) => b.month === month),
    [billables, month],
  );

  useEffect(() => {
    setSelected(monthRows.filter((b) => !b.invoiced).map((b) => b.key));
  }, [monthRows]);

  const chosen = monthRows.filter((b) => selected.includes(b.key));
  const total =
    Math.round(chosen.reduce((sum, b) => sum + b.item.amount, 0) * 100) / 100;
  const missing = missingProfileFields(profile);
  const existingForMonth = invoices.filter(
    (inv) => inv.month === month && inv.status !== "superseded",
  );

  function draft(): InvoiceDraft {
    return {
      userName: user?.displayName ?? user?.email ?? "",
      month,
      items: chosen.map((b) => b.item),
      total,
      bankName: profile?.bankName ?? "",
      bankAccount: profile?.bankAccount ?? "",
      bankAccountName: profile?.bankAccountName ?? "",
      submittedAt: new Date(),
    };
  }

  async function handleSend() {
    if (!user || chosen.length === 0) return;
    if (missing.length > 0) {
      toast("error", t("profile_required_toast"));
      return;
    }
    setSending(true);
    try {
      const d = draft();
      const pdfBase64 = await buildInvoicePdfBase64(d);
      const sentTo = await sendInvoiceEmail({
        userName: d.userName,
        userEmail: user.email ?? "",
        month,
        total,
        bankName: d.bankName,
        bankAccount: d.bankAccount,
        bankAccountName: d.bankAccountName,
        items: d.items,
        pdfBase64,
        fileName: invoiceFileName(d),
      });
      // Only record it once the mail actually went out.
      await submitInvoice({
        userId: user.uid,
        userName: d.userName,
        userEmail: user.email ?? "",
        month,
        items: d.items,
        bankName: d.bankName,
        bankAccount: d.bankAccount,
        bankAccountName: d.bankAccountName,
      });
      toast("success", `${t("invoice_sent")} ${sentTo.join(", ")}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("invoice_send_failed");
      toast("error", msg);
    } finally {
      setSending(false);
    }
  }

  if (loading || fetching) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user) {
    return (
      <div className="rounded-[20px] glass p-8 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("need_sign_in")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("invoice_need_sign_in")}</p>
        <Button asChild>
          <Link href="/">{t("browse_jobs")}</Link>
        </Button>
      </div>
    );
  }

  const today = new Date().getDate();
  const afterCutoff = today > INVOICE_CUTOFF_DAY;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {t("invoices_title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("invoices_subtitle")}</p>
      </div>

      {/* Cut-off notice */}
      <div
        className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
          afterCutoff
            ? "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5"
            : "border-border bg-white/50"
        }`}
      >
        <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          {afterCutoff ? t("cutoff_after") : t("cutoff_before")}
        </p>
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5 px-4 py-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
          <div className="flex-1">
            <p className="font-medium">{t("profile_required_title")}</p>
            <p className="text-muted-foreground">
              {t("invoice_needs_bank")}{" "}
              {missing.map((f) => t(`field_${f}` as never)).join("、")}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">{t("go_to_settings")}</Link>
          </Button>
        </div>
      )}

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {t("new_invoice_title")}
          </CardTitle>
          <CardDescription>{t("new_invoice_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {months.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("no_completed_lessons")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("billing_month")}:</span>
                {months.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonth(m)}
                    className={`press rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      month === m
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-white/60 text-muted-foreground"
                    }`}
                  >
                    {formatMonth(m, lang)}
                  </button>
                ))}
              </div>

              {existingForMonth.length > 0 && (
                <p className="rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5 px-3 py-2 text-xs">
                  {t("invoice_month_exists")}
                </p>
              )}

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="bg-white/60 text-xs text-muted-foreground">
                      <th className="px-3 py-2 w-10" />
                      <th className="px-3 py-2 text-left font-medium">{t("th_date")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_school")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_course")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("th_time")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("th_price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((b) => {
                      const start = toDate(b.item.startAt);
                      const end = toDate(b.item.endAt);
                      const isSel = selected.includes(b.key);
                      return (
                        <tr
                          key={b.key}
                          onClick={() =>
                            setSelected((prev) =>
                              prev.includes(b.key)
                                ? prev.filter((k) => k !== b.key)
                                : [...prev, b.key],
                            )
                          }
                          className={`border-t border-border/70 cursor-pointer transition-colors ${
                            isSel ? "bg-primary/5" : "hover:bg-white/40"
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 accent-[hsl(var(--primary))] cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {formatDateShort(start)}
                          </td>
                          <td className="px-3 py-2.5">
                            {b.item.schoolName}
                            {b.invoiced && (
                              <Badge variant="muted" className="ml-2 text-[10px]">
                                {t("already_invoiced")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5">{b.item.courseName || "—"}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {formatTimeRange(start, end)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium">
                            {formatCurrency(b.item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {chosen.length} {t("lessons_count_suffix")} ·{" "}
                  </span>
                  <span className="font-semibold text-base">
                    {t("total_label")}: {formatCurrency(total)}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={chosen.length === 0}
                    onClick={() => downloadInvoicePdf(draft())}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t("preview_pdf")}
                  </Button>
                  <Button
                    type="button"
                    disabled={sending || chosen.length === 0 || missing.length > 0}
                    onClick={handleSend}
                    className="gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t("send_invoice")}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("send_invoice_note")}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("invoice_history")}</CardTitle>
          <CardDescription>{t("invoice_history_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("no_invoices")}
            </p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const submitted = toDate(inv.submittedAt);
                return (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/50 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formatMonth(inv.month, lang)}</span>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.items.length} {t("lessons_count_suffix")} ·{" "}
                        {formatCurrency(inv.total)}
                        {submitted && ` · ${formatDateShort(submitted)}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      onClick={() => downloadInvoicePdf(draftFromInvoice(inv))}
                    >
                      <Download className="h-4 w-4" />
                      {t("download")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
