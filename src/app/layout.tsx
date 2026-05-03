import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Noto_Sans_KR, Nanum_Brush_Script } from "next/font/google";
import "./globals.css";
import Providers from "@/components/common/Providers";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const nanumBrush = Nanum_Brush_Script({
  variable: "--font-brush",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "C.O.D.E. — Celebrity Outfit Daily Edition",
  description: "셀럽의 데일리 착장을 발견하고 바로 구매하세요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import BottomNav from "@/components/common/BottomNav";
import MobileLayout from "@/components/common/MobileLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${instrumentSans.variable} ${notoSansKR.variable} ${nanumBrush.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <MobileLayout>
            {children}
          </MobileLayout>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
