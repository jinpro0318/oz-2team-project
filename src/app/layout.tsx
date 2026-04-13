import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Noto_Sans_KR } from "next/font/google";
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

export const metadata: Metadata = {
  title: "C.O.D.E. — Celebrity Outfit Daily Edition",
  description: "셀럽의 데일리 착장을 발견하고 바로 구매하세요",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${instrumentSans.variable} ${notoSansKR.variable}`}>
      <body className="min-h-dvh bg-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
