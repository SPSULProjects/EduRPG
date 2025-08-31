import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/app/components/ui/sonner"
import { ErrorBoundary } from "@/app/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EduRPG - Školní gamifikační platforma",
  description: "RPG-stylovaná platforma pro gamifikaci vzdělávání s úkoly, XP, úspěchy a obchodem.",
  keywords: ["gamifikace", "vzdělávání", "škola", "RPG", "úkoly", "XP"],
  authors: [{ name: "EduRPG Team" }],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}