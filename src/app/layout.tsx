import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_INIT_SCRIPT } from "@/lib/client/theme";

export const metadata: Metadata = {
  title: "BanCo — Chơi cờ trực tuyến",
  description: "Tạo bàn cờ, mời đối thủ và người xem chỉ bằng một đường link.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Áp dụng theme trước khi paint để tránh nháy sáng/tối */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
