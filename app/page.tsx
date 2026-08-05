"use client";

import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  LogIn,
  ShieldCheck,
  Sparkles,
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
import { useAuth } from "@/components/auth-provider";

export default function HomePage() {
  const { user, signInWithGoogle, configured } = useAuth();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-card/80 backdrop-blur-xl p-8 md:p-12">
        <div className="absolute inset-0 bg-grid-pattern bg-[length:32px_32px] opacity-30" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            智能 Helper 招聘管理系統
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            <span className="text-gradient">高效管理</span>
            <br />
            <span className="text-foreground">Helper 任務與報名</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            管理員建立學校活動任務，設定 TA／MT 名額與時薪。
            用戶透過 Google 登入、瀏覽任務、即時報名，
            自動區分<span className="text-foreground">已確認</span>
            與<span className="text-muted-foreground">後備</span>名單。
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <>
                <Button asChild size="lg">
                  <Link href="/tasks" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    瀏覽任務
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {user.isAdmin && (
                  <Button asChild size="lg" variant="outline">
                    <Link href="/admin" className="gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      管理後台
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => signInWithGoogle()}
                className="gap-2"
                disabled={!configured}
              >
                <LogIn className="h-4 w-4" />
                {configured ? "使用 Google 登入" : "Firebase 未設定"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {!configured && (
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3 mt-4">
              ⚠ Firebase 尚未設定 — 請複製 <code className="px-1 bg-background/50 rounded">.env.example</code> 為 <code className="px-1 bg-background/50 rounded">.env.local</code> 並填入 Firebase config 後重新啟動 dev server。
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Briefcase className="h-5 w-5" />}
          title="任務管理"
          description="管理員可建立、編輯、取消任務；設定 TA／MT 名額、時薪與備註。"
        />
        <FeatureCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="即時報名"
          description="用戶一鍵報名，系統自動判定「已確認」或「後備」狀態，名額額滿後自動排候補。"
        />
        <FeatureCard
          icon={<Users className="h-5 w-5" />}
          title="後備名單"
          description="已額滿的職位，後續報名者自動進入灰色後備名單，依報名順序自動遞補。"
        />
        <FeatureCard
          icon={<Calendar className="h-5 w-5" />}
          title="詳細時間"
          description="完整標示日期、星期、開始與結束時間，方便用戶選擇適合的時段。"
        />
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="管理員後台"
          description="獨立的管理後台，管理員可查看每個任務的報名名單（已確認 + 後備）。"
        />
        <FeatureCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="我的報名"
          description="用戶可隨時查看所有已報名的任務，包含已確認與後備狀態，可自行取消。"
        />
      </section>

      {/* CTA */}
      {!user && configured && (
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">準備好了嗎？</h2>
              <p className="text-muted-foreground">
                使用你的 Google 帳號登入，即可瀏覽所有開放的 Helper 任務並報名。
              </p>
              <Button onClick={() => signInWithGoogle()} className="gap-2">
                <LogIn className="h-4 w-4" />
                使用 Google 登入
              </Button>
            </div>
            <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-500/10 border-l border-border/40">
              <Sparkles className="h-24 w-24 text-primary/30" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="mt-3">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
