import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { Chatbot } from "@/components/chatbot";
import { publicFeatures, env } from "@/lib/env";
import "./globals.css";

const display = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: "OFFCUT — Industrial-grade leftovers. Maker-grade prices.", template: "%s · OFFCUT" },
  description:
    "Buy graded, measured off-cuts and dead-stock — leather, technical fabrics, aluminium, hardwood, marble, acrylic and carbon fibre — from Indian factories.",
  openGraph: { siteName: "OFFCUT", type: "website", locale: "en_IN" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F0E7" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1E1C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-signal focus:px-3 focus:py-2 focus:text-signal-ink">
          Skip to content
        </a>
        <Providers features={publicFeatures()}>{children}</Providers>
        <Chatbot />
      </body>
    </html>
  );
}
