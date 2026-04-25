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

## Finance Tracker Mobile App (`artifacts/mobile`)

Expo/React Native app for college student personal finance tracking.

### Features
- **Home Tab**: Animated SVG budget ring, category spending progress bars, savings goals carousel, recent expenses (tap to reveal edit/delete), smart insights chips, search bar
- **Analytics Tab**: Category pie chart, weekly bar chart, budget vs actual comparison, smart insights
- **Tasks Tab**: Finance reminders/tasks with deadline countdown colors, preset templates, complete/delete/edit
- **Settings**: Monthly budget & category limits editor, savings goals with fund-adding, quick-add templates manager, PIN lock (4-digit), CSV export via expo-sharing/expo-file-system

### Architecture
- **State**: `context/AppContext.tsx` — AsyncStorage-backed offline-first state for expenses, budget, tasks, goals, templates, PIN, streak
- **Colors**: `constants/colors.ts` — dark (Coinbase-inspired) + light themes
- **Components**: `BudgetRing` (Reanimated SVG), `Charts` (custom SVG pie/bar), `ExpenseForm`, `TaskForm`, `PinLock`
- **Navigation**: Expo Router tabs — NativeTabs (liquid glass on iOS 26+), BlurView tab bar (iOS), classic tabs (Android/web)

### Key packages
- `expo-file-system@~19.0.21` + `expo-sharing@~14.0.8` — CSV export
- `react-native-svg@15.12.1` — charts
- `@react-native-async-storage/async-storage` — offline storage
- `expo-haptics` — tactile feedback throughout
- `react-native-reanimated@~4.1.1` — budget ring animation
