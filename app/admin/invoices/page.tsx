"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  Download,
  Mail,
  Receipt,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import {
  deleteInvoice,
  listAllInvoices,
  markInvoicePaid,
  markInvoiceUnpaid,
  toDate,
} from "@/lib/db";
import { downloadInvoicePdf, draftFromInvoice } from "@/lib/invoice-pdf";
import { formatCurrency, formatDateShort, formatMonth } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";

type Filter = "all" | InvoiceStatus;

export default function AdminInvoicesPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLang();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("submitted");
  const [month, setMonth] = useState<string>("all");

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      setInvoices(await listAllInvoices());
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

  const months = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.month))).sort().reverse(),
    [invoices],
  );

  const shown = invoices.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      (month === "all" || i.month === month),
  );

  const outstanding = invoices
    .filter((i) => i.status === "submitted")
    .reduce((sum, i) => sum + i.total, 0);

  async function act(fn: () => Promise<void>, okKey: string) {
    setBusy(true);
    try {
      await fn();
      toast("success", t(okKey as never));
      await refresh();
    } catch (err) {
      console.error(err);
      toast("error", t("job_status_update_failed"));
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
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          {t("back_to_admin")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {t("admin_invoices_title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("admin_invoices_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label={t("stat_total_invoices")} value={String(invoices.length)} />
        <Stat
          label={t("stat_awaiting_payment")}
          value={String(invoices.filter((i) => i.status === "submitted").length)}
        />
        <Stat label={t("stat_outstanding")} value={formatCurrency(outstanding)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            {t("invoice_list")}
          </CardTitle>
          <CardDescription>{t("invoice_list_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["submitted", "paid", "superseded", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`press rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-white/60 text-muted-foreground"
                }`}
              >
                {t(
                  f === "all"
                    ? "filter_all"
                    : f === "paid"
                      ? "invoice_paid"
                      : f === "superseded"
                        ? "invoice_superseded"
                        : "invoice_submitted",
                )}
              </button>
            ))}
          </div>

          {months.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("billing_month")}:
              </span>
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
          )}

          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("no_invoices")}
            </p>
          ) : (
            <div className="space-y-2">
              {shown.map((inv) => {
                const submitted = toDate(inv.submittedAt);
                const paid = toDate(inv.paidAt ?? null);
                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-border bg-white/50 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{inv.userName}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatMonth(inv.month, lang)}
                          </span>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                        <a
                          href={`mailto:${inv.userEmail}`}
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Mail className="h-3 w-3" />
                          {inv.userEmail}
                        </a>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {inv.items.length} {t("lessons_count_suffix")} ·{" "}
                          {submitted && `${t("submitted_on")} ${formatDateShort(submitted)}`}
                          {paid && ` · ${t("paid_on")} ${formatDateShort(paid)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {formatCurrency(inv.total)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-white/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {inv.bankName}
                      </span>{" "}
                      · {inv.bankAccount} · {inv.bankAccountName}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => downloadInvoicePdf(draftFromInvoice(inv))}
                      >
                        <Download className="h-4 w-4" />
                        {t("download")}
                      </Button>
                      {inv.status === "submitted" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className="gap-2 text-[hsl(var(--success))] hover:text-[hsl(var(--success))]"
                          onClick={() =>
                            act(() => markInvoicePaid(inv.id, user.uid), "invoice_marked_paid")
                          }
                        >
                          <BadgeDollarSign className="h-4 w-4" />
                          {t("mark_paid")}
                        </Button>
                      )}
                      {inv.status === "paid" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          className="gap-2 text-muted-foreground"
                          onClick={() =>
                            act(() => markInvoiceUnpaid(inv.id), "invoice_marked_unpaid")
                          }
                        >
                          <Undo2 className="h-4 w-4" />
                          {t("mark_unpaid")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        className="gap-2 text-muted-foreground hover:text-destructive ml-auto"
                        onClick={() => {
                          if (confirm(t("invoice_delete_confirm"))) {
                            act(() => deleteInvoice(inv.id), "invoice_deleted");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-0.5">{value}</p>
    </div>
  );
}
