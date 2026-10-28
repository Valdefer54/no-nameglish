import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AddSentenceModal } from "@/components/AddSentenceModal";
import { getCurrentUser } from "@/lib/current-user";
import { SignOutButton } from "@/components/AccountForms";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b bg-background px-4 sm:px-6 py-3 flex flex-wrap gap-3 justify-between items-center sticky top-0 z-10">
          <div className="flex flex-wrap gap-4 items-center">
            <Link href="/" className="font-bold text-lg tracking-tight">
              no-nameglish
            </Link>
            {user && <>
              <Link href="/decks" className="text-sm text-muted-foreground hover:text-foreground min-h-11 inline-flex items-center">Decks</Link>
              <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground min-h-11 inline-flex items-center">Account</Link>
              {user.role === "admin" && <Link href="/users" className="text-sm text-muted-foreground hover:text-foreground min-h-11 inline-flex items-center">Users</Link>}
            </>}
          </div>
          {user && <div className="flex gap-2 items-center">
            <AddSentenceModal beginner={user.studyLevel === "beginner"} triggerLabel="Mine Sentence" variant="outline" size="sm" />
            <SignOutButton />
          </div>}
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
