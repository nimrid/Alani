import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alani - Fan Companion",
  description: "World Cup 2026 Fan Companion · Powered by TxLINE",
};

import { SolanaProvider } from "@/components/providers/SolanaProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-inter: 'Inter', sans-serif;
            --font-space-grotesk: 'Space Grotesk', sans-serif;
            --font-jetbrains-mono: 'JetBrains Mono', monospace;
          }
        `}} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
