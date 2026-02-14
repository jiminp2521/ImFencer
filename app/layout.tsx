import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "ImFencer - 프리미엄 펜싱 커뮤니티",
  description: "펜싱인들을 위한 프리미엄 소셜 플랫폼, ImFencer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="font-sans antialiased bg-background text-foreground"
      >
        <main className="min-h-screen pb-16 relative">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
