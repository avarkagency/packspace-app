import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // The Handoff counterparty is driven by timers; StrictMode's double-mount in dev would
  // fire them twice. Match Aboyz and keep a single invoke.
  reactStrictMode: false,
  // Prototype: never fail a build on type or lint issues.
  typescript: { ignoreBuildErrors: true },
  devIndicators: false
}

export default nextConfig
