import type { Metadata } from "next";
import { Inter, Noto_Serif_SC, Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "闲心子墨",
    template: "%s | 闲心子墨",
  },
  description: "狂野君的诗文空间 — 樗栎集原创 · 辑古录经典",
  openGraph: {
    title: "闲心子墨",
    description: "狂野君的诗文空间 — 樗栎集原创 · 辑古录经典",
    type: "website",
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${notoSerifSC.variable} ${geist.variable} font-sans`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        <QueryProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
