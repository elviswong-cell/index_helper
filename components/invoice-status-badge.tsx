"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useLang();
  if (status === "paid") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {t("invoice_paid")}
      </Badge>
    );
  }
  if (status === "superseded") {
    return <Badge variant="muted">{t("invoice_superseded")}</Badge>;
  }
  return <Badge variant="warning">{t("invoice_submitted")}</Badge>;
}
