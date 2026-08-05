"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarCheck,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "工作列表", icon: Briefcase },
  { href: "/my-registrations", label: "我的報名", icon: CalendarCheck, auth: true },
  { href: "/settings", label: "設定", icon: Settings, auth: true },
  { href: "/admin", label: "管理後台", icon: ShieldCheck, admin: true },
];

export function Header() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">
            INDEX ACADEMY
          </span>
          <span className="text-xs text-muted-foreground">工作列表</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            if (item.auth && !user) return null;
            if (item.admin && !user?.isAdmin) return null;
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-medium">
                  {user.displayName ?? user.email}
                </span>
                {user.isAdmin && (
                  <span className="text-[10px] text-primary">管理員</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">登出</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => signInWithGoogle()} className="gap-2">
              <LogIn className="h-4 w-4" />
              Google 登入
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-border overflow-x-auto">
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
                  active ? "bg-muted text-foreground" : "text-muted-foreground",
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
