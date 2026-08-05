"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarCheck,
  ClipboardList,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tasks", label: "瀏覽任務", icon: Briefcase },
  { href: "/my-registrations", label: "我的報名", icon: CalendarCheck, auth: true },
  { href: "/admin", label: "管理後台", icon: ShieldCheck, admin: true },
];

export function Header() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-5 w-5 text-background" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">
              <span className="text-gradient">Helper</span>
              <span className="ml-1 text-foreground/80">招聘平台</span>
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              智能任務管理系統
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            if (item.auth && !user) return null;
            if (item.admin && !user?.isAdmin) return null;
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-24 rounded-lg bg-muted/40 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-medium">{user.displayName ?? user.email}</span>
                {user.isAdmin && (
                  <span className="text-[10px] text-primary">管理員</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">登出</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => signInWithGoogle()}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Google 登入
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-border/60 overflow-x-auto">
        <div className="container flex items-center gap-1 py-2">
          {NAV.map((item) => {
            if (item.auth && !user) return null;
            if (item.admin && !user?.isAdmin) return null;
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
