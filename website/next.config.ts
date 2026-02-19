import type { NextConfig } from 'next'
import path from 'path'
import fs from 'fs'

// Resolve convex directory: use ../convex (monorepo) if available, else ./convex (Vercel)
const monorepoConvex = path.join(__dirname, '..', 'convex')
const localConvex = path.join(__dirname, 'convex')
const convexDir = fs.existsSync(monorepoConvex) ? monorepoConvex : localConvex

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Ensure NEXT_PUBLIC_CONVEX_URL is available at runtime in Edge middleware,
    // not just inlined at build time for client code
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  typescript: {
    // Convex files (../convex/) are type-checked by `npx convex deploy`,
    // not by the Next.js build. Skip here to avoid missing @auth/core types.
    ignoreBuildErrors: true,
  },
  // Only trace up to monorepo root when it exists (local dev), not on Vercel
  ...(fs.existsSync(monorepoConvex) ? { outputFileTracingRoot: path.join(__dirname, '..') } : {}),
  webpack: (config, { isServer: _ }) => {
    // Resolve @convex/* path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@convex': convexDir,
    }
    // Ensure convex/_generated files can resolve 'convex/server' etc.
    // from the website's node_modules
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || ['node_modules']),
    ]
    return config
  },
}

export default nextConfig
