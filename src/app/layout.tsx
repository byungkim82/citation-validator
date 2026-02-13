import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APA Citation Checker",
  description: "Google Scholar 참고문헌을 APA 7th Edition 규칙에 맞게 검증하고 자동 수정합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
