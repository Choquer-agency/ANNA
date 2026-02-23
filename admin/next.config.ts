import type { NextConfig } from 'next'
import path from 'path'
import fs from 'fs'

// Resolve convex directory: use ../convex (monorepo) if available, else ./convex (Vercel)
const monorepoConvex = path.join(__dirname, '..', 'convex')
const localConvex = path.join(__dirname, 'convex')
const convexDir = fs.existsSync(monorepoConvex) ? monorepoConvex : localConvex

// Resolve shared directory: use ../src/shared (monorepo) if available
const monorepoShared = path.join(__dirname, '..', 'src', 'shared')
const sharedDir = fs.existsSync(monorepoShared) ? monorepoShared : path.join(__dirname, 'src', 'shared')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(fs.existsSync(monorepoConvex) ? { outputFileTracingRoot: path.join(__dirname, '..') } : {}),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@convex': convexDir,
      '@shared': sharedDir,
    }
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || ['node_modules']),
    ]
    return config
  },
}

export default nextConfig
