import { Inter, Victor_Mono } from "next/font/google"

import type { Metadata } from "next"

import "./globals.css"

// Victor Mono carries the chrome and every value; Inter is the counterweight on the cells' sub line.
const victorMono = Victor_Mono({ variable: "--font-victor-mono", subsets: ["latin"] })
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PackSpace — visual wallet workspace",
  description: "An object workspace for the Project G ecosystem. Prototype: dashboard + Send + Handoff."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `font-mono` has to be the utility, not a `font-family: var(--font-mono)` rule in globals.css:
          the theme block is `@theme inline`, which inlines its values into utilities and never emits
          them as custom properties. A raw var(--font-mono) resolves to nothing and falls back to system
          sans — silently, which is exactly how it hid. */}
      <body className={`${victorMono.variable} ${inter.variable} font-mono antialiased`}>{children}</body>
    </html>
  )
}
