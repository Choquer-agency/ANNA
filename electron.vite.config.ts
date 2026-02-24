import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'

// Load .env so define values are available at build time
config({ path: resolve(__dirname, '.env') })

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'whisper-check': resolve(__dirname, 'src/main/whisper-check.ts')
        }
      }
    },
    define: {
      'process.env.CONVEX_URL': JSON.stringify(process.env.CONVEX_URL),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.ANTHROPIC_API_KEY),
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
      'process.env.LANGFUSE_PUBLIC_KEY': JSON.stringify(process.env.LANGFUSE_PUBLIC_KEY),
      'process.env.LANGFUSE_BASE_URL': JSON.stringify(process.env.LANGFUSE_BASE_URL),
      'process.env.WEBSITE_URL': JSON.stringify(process.env.WEBSITE_URL || 'https://annatype.io'),
      'process.env.POSTHOG_API_KEY': JSON.stringify(process.env.POSTHOG_API_KEY),
      'process.env.POSTHOG_HOST': JSON.stringify(process.env.POSTHOG_HOST),
      // AUTO_UPDATE_TOKEN intentionally NOT included — use public GitHub releases
      // to avoid embedding a GitHub token in the distributed binary
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'audio-preload': resolve(__dirname, 'src/preload/audio-preload.ts'),
          'recording-preload': resolve(__dirname, 'src/preload/recording-preload.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.POSTHOG_API_KEY': JSON.stringify(process.env.POSTHOG_API_KEY),
      'process.env.POSTHOG_HOST': JSON.stringify(process.env.POSTHOG_HOST),
      'process.env.APP_VERSION': JSON.stringify(require('./package.json').version),
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          'audio-capture': resolve(__dirname, 'src/renderer/audio-capture.html'),
          'recording-indicator': resolve(__dirname, 'src/renderer/recording-indicator.html')
        }
      }
    }
  }
})
