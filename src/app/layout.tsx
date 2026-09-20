import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Family Lineage",
  description: "Private family trees, letters, and an ask box that answers from your own archive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${serif.variable} ${sans.variable} font-serif text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
