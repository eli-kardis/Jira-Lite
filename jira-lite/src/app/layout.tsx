import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jira Lite - AI 기반 이슈 트래킹",
  description: "AI 기반 이슈 트래킹 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
