"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { user, loading, signInWithGoogle, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30">
            <Sparkles className="h-7 w-7 text-background" strokeWidth={2.5} />
          </div>
          <CardTitle className="text-2xl">登入 INDEX ACADEMY</CardTitle>
          <CardDescription>
            使用你的 Google 帳號登入，即可報名工作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => signInWithGoogle()}
            className="w-full gap-2"
            size="lg"
            disabled={!configured || loading}
          >
            <LogIn className="h-4 w-4" />
            {configured ? "使用 Google 帳號登入" : "Firebase 未設定"}
          </Button>

          {user?.isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>你已登入為管理員，可以前往後台管理任務</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            登入即表示同意我們的使用條款與隱私權政策。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
