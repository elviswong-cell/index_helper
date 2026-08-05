import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "INDEX ACADEMY Job Board",
  description:
    "INDEX ACADEMY Job Board — browse open jobs, apply instantly, confirmed and pending lists managed automatically",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <LanguageProvider>
          <AuthProvider>
            <Toaster>
              <Header />
              <main className="container py-6 md:py-10">{children}</main>
            </Toaster>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
