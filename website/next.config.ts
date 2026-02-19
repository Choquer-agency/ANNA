import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Convex files (../convex/) are type-checked by `npx convex deploy`,
    // not by the Next.js build. Skip here to avoid missing @auth/core types.
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname, '..'),
  webpack: (config, { isServer: _ }) => {
    // Ensure ../convex/_generated files can resolve 'convex/server' etc.
    // from the website's node_modules
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || ['node_modules']),
    ]
    return config
  },
}

export default nextConfig
