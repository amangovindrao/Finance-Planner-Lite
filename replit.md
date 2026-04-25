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

Expo/React Native app for Indian college student personal finance tracking.

### Features
- **Home Tab**: Animated SVG budget ring (₹), category spending bars, savings goals, loans (Given/Taken), recent expenses, search, privacy mode eye toggle
- **Analytics Tab**: Category pie chart, weekly ₹ bar chart, budget vs actual comparison, smart insights
- **Tasks Tab**: Finance reminders/tasks with deadline countdown colors, preset templates, complete/delete/edit
- **AI Assistant Tab (4th)**: Offline-first smart finance assistant that responds in Hinglish, contextually aware of spending/balance/loans. No network required.
- **Settings**: Budget editor (₹15000 default), savings goals, PIN lock, Privacy Mode toggle, notification prefs, CSV export

### Indian-Specific Features
- **₹ Currency**: All amounts shown in Indian Rupees (₹X, ₹XK, ₹XL format)
- **Given/Taken Money**: Track who owes you (lent) and who you owe (borrowed) with settle/edit/delete
- **Privacy Mode**: Toggle to hide all balances and amounts with ₹**** mask
- **Indian Merchant Autocategorize**: Zomato, Swiggy, Ola, Rapido, Paytm, Flipkart, Myntra, etc.
- **Default Budget**: ₹15000/month with Indian category limits

### Architecture
- **State**: `context/AppContext.tsx` — SQLite (native) / AsyncStorage (web) offline-first, 1020+ lines. Includes Expense, Account, Loan, Budget, Task, SavingsGoal, Template + privacy/PIN state.
- **DB**: `db/schema.ts` — loans table, `db/database.ts` — DbLoan type + MIGRATE_SQL_STATEMENTS
- **Currency Utils**: `utils/currency.ts` — `fmt()`, `fmtFull()`, `fmtHidden()`
- **Colors**: `constants/colors.ts` — dark (Coinbase-inspired) + light themes
- **Navigation**: 4-tab Expo Router — NativeTabs (liquid glass iOS 26+), BlurView (iOS), classic (Android/web)

### Key packages
- `expo-file-system@~19.0.21` + `expo-sharing@~14.0.8` — CSV export
- `expo-sqlite` — SQLite sync native storage
- `react-native-svg@15.12.1` — charts
- `@react-native-async-storage/async-storage` — offline storage fallback (web)
- `expo-haptics` — tactile feedback
- `react-native-reanimated@~4.1.1` — budget ring animation
- `expo-notifications@~0.32.16` — budget threshold alerts, task reminders
