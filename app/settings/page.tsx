"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Phone,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster-context";
import { getUserProfile, saveUserProfile } from "@/lib/db";
import { uploadScrc } from "@/lib/storage";
import { missingProfileFields, type UserProfile } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const fileInput = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [scrcUrl, setScrcUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        if (cancelled) return;
        setProfile(p);
        setPhone(p?.phone ?? "");
        setBankName(p?.bankName ?? "");
        setBankAccount(p?.bankAccount ?? "");
        setBankAccountName(p?.bankAccountName ?? "");
        setScrcUrl(p?.scrcUrl ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleUpload(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadScrc(user.uid, file);
      // Persist immediately — a half-uploaded profile helps nobody.
      await saveUserProfile(user.uid, {
        scrcUrl: url,
        scrcUploadedAt: new Date(),
        displayName: user.displayName ?? "",
        email: user.email ?? "",
      });
      setScrcUrl(url);
      setProfile((p) => ({ ...(p ?? { uid: user.uid, phone }), scrcUrl: url }));
      toast("success", t("scrc_uploaded"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("upload_failed");
      toast("error", msg);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmedPhone = phone.trim();
    if (!/^[0-9+\-\s()]{6,20}$/.test(trimmedPhone)) {
      toast("error", t("invalid_phone"));
      return;
    }
    setBusy(true);
    try {
      const next = {
        phone: trimmedPhone,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountName: bankAccountName.trim(),
        displayName: user.displayName ?? "",
        email: user.email ?? "",
      };
      await saveUserProfile(user.uid, next);
      setProfile((p) => ({ ...(p ?? { uid: user.uid }), ...next, scrcUrl }));
      toast("success", t("profile_saved"));
    } catch (err) {
      console.error(err);
      toast("error", t("save_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || fetching) {
    return <div className="text-muted-foreground">{t("loading")}</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <h2 className="text-lg font-medium mb-2">{t("need_sign_in")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("need_sign_in_desc")}</p>
        <Button asChild>
          <Link href="/">{t("browse_jobs")}</Link>
        </Button>
      </div>
    );
  }

  const current: UserProfile = {
    uid: user.uid,
    phone: phone.trim(),
    bankName: bankName.trim(),
    bankAccount: bankAccount.trim(),
    bankAccountName: bankAccountName.trim(),
    scrcUrl,
  };
  const missing = missingProfileFields(current);
  const complete = missing.length === 0;

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings_subtitle_full")}</p>
      </div>

      <div
        className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
          complete
            ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5"
            : "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/5"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(var(--success))]" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-[hsl(var(--warning))]" />
        )}
        <div>
          <p className="font-medium">
            {complete ? t("profile_complete_title") : t("profile_incomplete_title")}
          </p>
          <p className="text-muted-foreground">
            {complete
              ? t("profile_complete_desc")
              : `${t("profile_incomplete_desc")} ${missing
                  .map((f) => t(`field_${f}` as never))
                  .join("、")}`}
          </p>
        </div>
      </div>

      {/* SCRC */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            {t("scrc_title")}
          </CardTitle>
          <CardDescription>{t("scrc_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scrcUrl ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white/60 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
              <span className="flex-1">{t("scrc_on_file")}</span>
              <a
                href={scrcUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t("view")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("scrc_none")}</p>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("uploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {scrcUrl ? t("scrc_replace") : t("scrc_upload")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Phone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              {t("contact_phone_title")}
            </CardTitle>
            <CardDescription>{t("contact_phone_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("contact_phone_title")} *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder={t("phone_placeholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5" />
              {t("bank_title")}
            </CardTitle>
            <CardDescription>{t("bank_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">{t("field_bankName")} *</Label>
              <Input
                id="bankName"
                placeholder={t("bank_name_placeholder")}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">{t("field_bankAccount")} *</Label>
              <Input
                id="bankAccount"
                inputMode="numeric"
                placeholder={t("bank_account_placeholder")}
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">{t("field_bankAccountName")} *</Label>
              <Input
                id="bankAccountName"
                placeholder={t("bank_holder_placeholder")}
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{t("bank_holder_hint")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={busy} className="gap-2">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">{t("browse_jobs")}</Link>
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("account_info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {t("name_label")}:{" "}
            <span className="text-foreground">{user.displayName ?? "—"}</span>
          </p>
          <p className="text-muted-foreground">
            {t("email_label")}: <span className="text-foreground">{user.email ?? "—"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
