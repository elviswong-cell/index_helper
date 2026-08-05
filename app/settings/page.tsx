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

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
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
      toast("error", "請輸入有效的電話號碼");
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
      toast("success", "電話號碼已儲存");
    } catch (err) {
      console.error(err);
      toast("error", "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  if (loading || fetching) {
    return <div className="text-muted-foreground">載入中...</div>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <h2 className="text-lg font-medium mb-2">需要登入</h2>
        <p className="text-sm text-muted-foreground mb-4">
          請先用 Google 登入才能設定個人資料
        </p>
        <Button asChild>
          <Link href="/">回到工作列表</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">
          報名工作前必須先填寫電話號碼，方便我們聯絡你。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            聯絡電話
          </CardTitle>
          <CardDescription>
            此電話號碼會隨你的報名一併提交給管理員。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">電話號碼 *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="例如：9123 4567"
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
                電話號碼已設定，你可以報名工作了
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={busy} className="gap-2">
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    儲存中...
                  </>
                ) : (
                  "儲存"
                )}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/">回到工作列表</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">帳號資料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            姓名：<span className="text-foreground">{user.displayName ?? "—"}</span>
          </p>
          <p className="text-muted-foreground">
            電郵：<span className="text-foreground">{user.email ?? "—"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
