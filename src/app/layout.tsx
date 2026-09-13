import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KawaiiMedicine",
    template: "%s | KawaiiMedicine",
  },
  description: "แพลตฟอร์มการเรียนแพทยศาสตร์: วิดีโอบทเรียนและข้อสอบ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoThai.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
