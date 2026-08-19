import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AddSentenceModal } from "@/components/AddSentenceModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "no-nameglish",
  description: "Spaced repetition vocabulary trainer for English learners",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-background px-6 py-3 flex justify-between items-center sticky top-0 z-10">
          <div className="flex gap-6 items-center">
            <Link href="/" className="font-bold text-lg tracking-tight">
              no-nameglish
            </Link>
            <Link
              href="/decks"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Decks
            </Link>
          </div>
          <AddSentenceModal
            triggerLabel="Mine Sentence"
            variant="outline"
            size="sm"
          />
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
