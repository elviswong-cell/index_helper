"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
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
import { useLang } from "@/lib/i18n";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (!cancelled && profile?.phone) {
          setPhone(profile.phone);
          setSaved(true);
        }
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = phone.trim();
    if (!/^[0-9+\-\s()]{6,20}$/.test(trimmed)) {
      toast("error", t("invalid_phone"));
      return;
    }
    setBusy(true);
    try {
      await saveUserProfile(user.uid, {
        phone: trimmed,
        displayName: user.displayName ?? "",
        email: user.email ?? "",
      });
      setSaved(true);
      toast("success", t("phone_save_success"));
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
        <p className="text-sm text-muted-foreground mb-4">
          {t("need_sign_in_desc")}
        </p>
        <Button asChild>
          <Link href="/">{t("browse_jobs")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings_subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            {t("contact_phone_title")}
          </CardTitle>
          <CardDescription>
            {t("contact_phone_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("contact_phone_title")} *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder={t("phone_placeholder")}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
                required
              />
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                {t("phone_saved")}
              </div>
            )}

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("account_info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {t("name_label")}: <span className="text-foreground">{user.displayName ?? "—"}</span>
          </p>
          <p className="text-muted-foreground">
            {t("email_label")}: <span className="text-foreground">{user.email ?? "—"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
