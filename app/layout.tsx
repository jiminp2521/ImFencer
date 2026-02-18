import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileBridge } from "@/components/mobile/MobileBridge";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-app",
  display: "swap",
});

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
    <html lang="en" className={`dark ${notoSansKr.variable}`}>
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
