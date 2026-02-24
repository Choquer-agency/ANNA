# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anna is a macOS Electron app for AI-powered voice dictation, with a Next.js admin dashboard, a Next.js marketing website, and a Convex backend. The desktop app captures audio, transcribes via OpenAI Whisper, post-processes with Claude, and injects text into the active application.

## Development Commands

### Electron Desktop App (root)
- `npm run dev` — start Electron dev server
- `npm run build` — build with electron-vite
- `npm run build:mac` — full signed DMG build (cross-arch install, native helpers, vite build, electron-builder)
- `npm run build:natives` — compile Swift helper binaries (fn-key, accessibility-probe, anna-helper)
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `npm run postinstall` — rebuild better-sqlite3 for Electron (`electron-rebuild -f -w better-sqlite3`)

### Convex Backend
- `npx convex dev` — start local Convex dev server (watches `convex/` directory)
- `npx convex deploy` — deploy to Convex cloud

### Admin Dashboard (`admin/`)
- `cd admin && npm run dev` — start Next.js admin dev server
- `cd admin && npm run build` — production build

### Marketing Website (`website/`)
- `cd website && npm run dev` — start Next.js website dev server
- `cd website && npm run build` — production build

## Architecture

### Monorepo Layout
```
src/              → Electron app (main process, preload, React renderer)
admin/            → Next.js admin dashboard (separate package.json)
website/          → Next.js marketing site (separate package.json)
convex/           → Convex backend (schema, queries, mutations, webhooks)
resources/        → Native Swift helper binaries and sound files
scripts/          → Build scripts for native modules
```

Each sub-project has its own `package.json`. The admin and website apps reference `../convex` and `../src/shared` via webpack aliases in their `next.config.ts`.

### Electron App Structure (`src/`)
- **Main process** (`src/main/`): Node.js — app lifecycle, IPC handlers, dictation pipeline, SQLite database, Convex cloud sync, hotkey management, tray menu, subscription/paywall logic
- **Preload** (`src/preload/`): IPC bridges exposing `window.annaAPI` to renderer
- **Renderer** (`src/renderer/src/`): React + Tailwind UI — pages for sessions, dictionary, snippets, styles, notes, settings, onboarding
- **Shared** (`src/shared/`): TypeScript types and pricing definitions used by both main and renderer

### Dictation Pipeline (`src/main/pipeline.ts`)
Core data flow: hotkey press → audio capture (`audio.ts`) → active window detection (`activeWindow.ts`) → Whisper transcription (`transcribe.ts`) → Claude post-processing (`process.ts`) → dictionary/snippet expansion → text injection via clipboard (`inject.ts`) → session sync to Convex (`convex.ts`)

### Data Storage
- **Local**: SQLite via better-sqlite3 (`src/main/db.ts`) — sessions, dictionary, snippets, notes, settings
- **Cloud**: Convex (`convex/schema.ts`) — user sessions, word usage tracking, subscriptions, user profiles

### Authentication
Desktop app uses `anna://auth-callback` deep link protocol. User signs in via browser → Convex Auth → redirect back to Electron app with token.

### Subscriptions & Payments
Stripe handles billing. Convex stores subscription state and receives Stripe webhooks (`convex/http.ts`, `convex/stripe.ts`). Main process tracks weekly word usage against plan limits (`src/main/subscription.ts`).

### IPC Pattern
The preload layer (`src/preload/index.ts`) exposes ~100+ methods on `window.annaAPI`. Renderer calls these; main process handles them via `ipcMain.handle()` in `src/main/index.ts`.

## Key Technologies
- **Build**: electron-vite (Vite-based Electron build tool)
- **Desktop UI**: React 18 + Tailwind CSS 4
- **Backend**: Convex (real-time DB, auth, server functions)
- **AI**: OpenAI API (Whisper transcription), Anthropic SDK (Claude post-processing), optional local Whisper via `@fugood/whisper.node`
- **Payments**: Stripe
- **Analytics**: PostHog (product analytics), Langfuse (LLM observability)
- **Native modules**: better-sqlite3 (requires electron-rebuild), custom Swift binaries for macOS accessibility/text injection

## Important Notes
- After `npm install`, better-sqlite3 must be rebuilt for Electron (handled by `postinstall` script)
- Native Swift helpers in `resources/` are compiled via `npm run build:natives` and need Xcode command-line tools
- The app targets macOS only (arm64 + x64) with hardened runtime and notarization
- Convex functions are auto-typed — after schema changes, types regenerate in `convex/_generated/`
- Environment variables (API keys, Convex URLs) are loaded from `.env` and injected at build time by electron-vite
