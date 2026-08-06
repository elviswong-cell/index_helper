"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarCheck,
  LogIn,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export function Header() {
  const { user, signInWithGoogle, signOut, loading } = useAuth();
  const pathname = usePathname();
  const { lang, setLang, t } = useLang();

  const NAV = [
    { href: "/", label: t("nav_jobs"), icon: Briefcase },
    { href: "/my-registrations", label: t("nav_my_registrations"), icon: CalendarCheck, auth: true },
    { href: "/invoices", label: t("nav_invoices"), icon: Receipt, auth: true },
    { href: "/settings", label: t("nav_settings"), icon: Settings, auth: true },
    { href: "/admin", label: t("nav_admin"), icon: ShieldCheck, admin: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass border-x-0 border-t-0 rounded-none">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Index Academy" className="h-10 md:h-12 w-auto" />
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
                  "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-black/[0.06] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/[0.04]",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-border bg-white/60 p-0.5 text-xs font-medium">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "press rounded-full px-2.5 py-1 transition-colors",
                lang === "en" ? "bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("zh")}
              className={cn(
                "press rounded-full px-2.5 py-1 transition-colors",
                lang === "zh" ? "bg-foreground text-background" : "text-muted-foreground",
              )}
            >
              中
            </button>
          </div>

          {loading ? (
            <div className="h-9 w-24 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-medium">
                  {user.displayName ?? user.email}
                </span>
                {user.isAdmin && (
                  <span className="text-[10px] text-primary">{t("admin_badge")}</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("logout")}</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => signInWithGoogle()} className="gap-2">
              <LogIn className="h-4 w-4" />
              {t("google_login")}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden border-t border-white/60 overflow-x-auto">
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
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap",
                  active ? "bg-black/[0.06] text-foreground" : "text-muted-foreground",
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
