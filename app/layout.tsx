import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileBridge } from "@/components/mobile/MobileBridge";

export const metadata: Metadata = {
  title: "ImFencer - 프리미엄 펜싱 커뮤니티",
  description: "펜싱인들을 위한 프리미엄 소셜 플랫폼, ImFencer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="font-sans antialiased bg-background text-foreground app-shell"
      >
        <main className="app-main relative">
          {children}
        </main>
        <MobileBridge />
        <BottomNav />
      </body>
    </html>
  );
}
