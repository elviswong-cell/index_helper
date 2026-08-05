import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Helper 招聘平台",
  description: "管理員建立任務、用戶報名、已確認或後備 — 全方位 Helper 招聘管理系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <Toaster>
            <Header />
            <main className="container py-6 md:py-10">{children}</main>
          </Toaster>
        </AuthProvider>
      </body>
    </html>
  );
}
