import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "INDEX ACADEMY 工作列表",
  description: "INDEX ACADEMY 工作列表 — 瀏覽開放工作、即時報名，自動區分已確認與後備名單",
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
