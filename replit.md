# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Mobile App (artifacts/mobile)

- **Stack**: Expo SDK 54 + Expo Router + TypeScript + Supabase + React Query
- **Package**: `com.nexortec.soma` — SOMA, Sistema Orçamentário para Motorista de Aplicativo
- **Theme**: dark blue/cyan; Footer "Desenvolvido por Nexor-Tec - 2026"
- **Monetization**: RevenueCat (Free vs Pro); keys in `EXPO_PUBLIC_REVENUECAT_*`
- **New Architecture**: `newArchEnabled: true` required by `react-native-reanimated ~4.1.1`

### Critical dependency notes

- `react-native-reanimated ~4.1.1` (new arch) requires `react-native-worklets@0.5.1` as a build-time peer.
  - The worklets package provides the Babel plugin used by reanimated's `plugin/index.js`.
  - **NEVER remove `react-native-worklets`** — doing so breaks Metro bundling with `Cannot find module 'react-native-worklets/plugin'`.
  - `.npmrc` has `public-hoist-pattern[]=react-native-worklets` so pnpm hoists it to root `node_modules` where Babel can find it.
- `babel-plugin-react-compiler` is intentionally NOT installed — Expo SDK 54 auto-enables React Compiler when it detects this package, causing bundle compilation failures.
- `expo-task-manager@14.0.9` — must stay at ~14.0.9; the `^55` range is incompatible with SDK 54.
- RLS pattern: Supabase `.update().select().maybeSingle()` can return `null` data on success → `jornadaService.update` returns `Jornada | null`, never throws on null.
