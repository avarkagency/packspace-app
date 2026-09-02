import { Inter, Victor_Mono } from "next/font/google"

import type { Metadata } from "next"

import "./globals.css"

// Inter is the voice of the whole desktop; Victor Mono stays available for raw addresses and hashes.
const victorMono = Victor_Mono({ variable: "--font-victor-mono", subsets: ["latin"] })
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PackSpace — visual wallet workspace",
  description: "The wallet as a desktop — every holding, contact and pack an object you act on directly. A Project G prototype."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `font-sans` has to be the utility, not a `font-family: var(--font-sans)` rule in globals.css:
          the theme block is `@theme inline`, which inlines its values into utilities and never emits
          them as custom properties. A raw var(--font-sans) resolves to nothing and falls back to system
          sans — silently, which is exactly how it hid. */}
      <body className={`${victorMono.variable} ${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
