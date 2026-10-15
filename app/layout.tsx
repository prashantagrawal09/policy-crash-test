import type { Metadata } from "next";
import { Archivo, Inter, Lora } from "next/font/google";
import { Disclaimer } from "@/components/Disclaimer";
import "./globals.css";

// Headings: Archivo at black weight on its condensed width axis. Numbers and labels: Inter. Diaries: Lora italic.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], style: ["italic"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "Policy Crash Test",
  description:
    "Paste any policy or headline and watch a town of 8 fictional Singapore residents react: who gains, who loses, by how much, and how it feels.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable} ${lora.variable} antialiased`}>
      <body className="min-h-screen bg-paper font-sans text-ink">
        <div className="hazard-stripes h-2 w-full" aria-hidden />
        {children}
        <Disclaimer />
      </body>
    </html>
  );
}
