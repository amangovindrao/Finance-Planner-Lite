# Finance Tracker

> A full-featured personal finance tracker built for Indian college students — track expenses, manage budgets, monitor loans, and chat with an offline AI assistant, all in ₹.

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Screenshots Overview](#screenshots-overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Layer](#data-layer)
- [State Management](#state-management)
- [Screens & Components](#screens--components)
- [Indian-Specific Features](#indian-specific-features)
- [Notification System](#notification-system)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Build the APK](#build-the-apk)
- [Publish to Play Store](#publish-to-play-store)
- [Publish to App Store](#publish-to-app-store)

---

## Features

| Category | Feature |
|---|---|
| Expenses | Add, edit, delete with auto-categorization |
| Budget | Monthly budget ring, category limits, custom alert thresholds |
| Analytics | 6-month trends, category pie chart, weekly bar chart |
| Transactions | Full history with search, filter, and sort |
| Loans | Given/taken money tracker with settle & edit |
| AI Assistant | Offline Hinglish chat, context-aware finance tips |
| Goals | Savings goals with fund-adding and progress tracking |
| Tasks | Finance reminders with deadline countdown |
| Privacy | Privacy mode (hide all amounts), PIN lock |
| Export | CSV export of all expenses |
| Notifications | Budget threshold alerts (custom %, no duplicate alerts) |
| Profile | Edit name + profile photo from settings |

---

## Screenshots Overview

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   HOME TAB      │   │  ANALYTICS TAB  │   │   TASKS TAB     │   │   AI ASSISTANT  │
│                 │   │                 │   │                 │   │                 │
│  Budget Ring    │   │  6-Month Trend  │   │ Finance Tasks   │   │ Hinglish Chat   │
│  ₹8,200/₹15,000 │   │  Bar Chart      │   │ with deadlines  │   │ "Bhai food pe   │
│                 │   │                 │   │                 │   │ zyada kharch    │
│  Category Bars  │   │  Category Pie   │   │ + Add Task      │   │ ho raha hai"    │
│  Food    ████░  │   │  (tap to filter)│   │                 │   │                 │
│  Travel  ██░░░  │   │                 │   │ Template Tasks  │   │ Context-aware   │
│                 │   │  Weekly Bars    │   │ - Pay rent      │   │ spending advice │
│  Savings Goals  │   │  Budget vs Act  │   │ - File ITR      │   │                 │
│  [Bike ──60%──] │   │                 │   │ - Recharge      │   │ No internet     │
│                 │   │  Spending by    │   │                 │   │ required        │
│  Loans Section  │   │  Account        │   │                 │   │                 │
│  Given ₹500 →   │   │                 │   │                 │   │                 │
│  Taken ₹200 ←   │   │                 │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FINANCE TRACKER APP                        │
│                                                                    │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │                     EXPO ROUTER                          │    │
│   │              (File-based Navigation)                     │    │
│   │                                                          │    │
│   │   /setup → /lock → /(tabs) → /settings → /transactions  │    │
│   └─────────────────────────────────────────────────────────┘    │
│                              │                                     │
│   ┌──────────────────────────▼──────────────────────────────┐    │
│   │                    TAB NAVIGATOR                          │    │
│   │    Home │ Analytics │ Tasks │ AI Assistant               │    │
│   └──────────────────────────────────────────────────────────┘    │
│                              │                                     │
│   ┌──────────────────────────▼──────────────────────────────┐    │
│   │                    APP CONTEXT                            │    │
│   │         (Single global state — React Context)            │    │
│   │                                                          │    │
│   │  Expenses · Budget · Accounts · Loans · Goals            │    │
│   │  Tasks · Templates · PIN · Privacy · Notifications       │    │
│   └───────────────────┬──────────────────────────────────────┘   │
│                        │                                           │
│          ┌─────────────┴─────────────┐                           │
│          │                           │                            │
│   ┌──────▼──────┐          ┌────────▼────────┐                  │
│   │   SQLite     │          │  AsyncStorage    │                  │
│   │  (Native)    │          │  (Web Fallback)  │                  │
│   └─────────────┘          └─────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

### Navigation Flow

```
App Launch
    │
    ├── Not Onboarded? ──→ /setup (Name + Budget + Accounts)
    │                             │
    │                             └──→ /(tabs)/index
    │
    ├── PIN Set? ──→ /lock (PIN entry)
    │                      │
    │                      └──→ /(tabs)/index
    │
    └── Ready ──→ /(tabs)/index (Home Dashboard)
                        │
                        ├── /(tabs)/analytics
                        ├── /(tabs)/tasks
                        ├── /(tabs)/assistant
                        ├── /settings
                        └── /transactions
```

### Data Flow

```
User Action (e.g. "Add Expense")
        │
        ▼
  ExpenseForm Component
        │
        ▼
  AppContext.addExpense()
        │
        ├──→ SQLite INSERT (native)
        │        └── expenses table
        │
        ├──→ AsyncStorage SET (web)
        │        └── @ft_expenses key
        │
        ├──→ Check budget thresholds
        │        └── Fire notification if needed
        │        └── Persist notifiedThresholds
        │
        └──→ setExpenses(next)
                 └── React re-renders Home + Analytics
```

---

## Project Structure

```
artifacts/mobile/
│
├── app/                          # All screens (Expo Router)
│   ├── _layout.tsx               # Root layout, auth guard, PIN lock
│   ├── setup.tsx                 # Onboarding (name, budget, accounts)
│   ├── lock.tsx                  # PIN lock screen
│   ├── settings.tsx              # Full settings screen
│   ├── transactions.tsx          # Transaction history (search/filter/sort)
│   └── (tabs)/                   # Bottom tab screens
│       ├── _layout.tsx           # Tab bar config (iOS liquid glass / classic)
│       ├── index.tsx             # Home dashboard
│       ├── analytics.tsx         # Charts and trends
│       ├── tasks.tsx             # Finance reminders
│       └── assistant.tsx         # Hinglish AI chat
│
├── components/                   # Reusable UI components
│   ├── BudgetRing.tsx            # Animated SVG budget donut ring
│   ├── ExpenseForm.tsx           # Add/edit expense bottom sheet
│   ├── TaskForm.tsx              # Add/edit task modal
│   ├── PinLock.tsx               # 4-digit PIN input
│   ├── ErrorBoundary.tsx         # App-level error boundary
│   ├── ErrorFallback.tsx         # Error display + stack trace
│   └── KeyboardAwareScrollViewCompat.tsx
│
├── context/
│   └── AppContext.tsx            # ~1100 lines — all state + persistence
│
├── db/
│   ├── schema.ts                 # SQL CREATE TABLE statements
│   └── database.ts               # DB types, init, migrations
│
├── utils/
│   ├── currency.ts               # fmt(), fmtFull(), fmtHidden() helpers
│   └── notifications.ts          # Push notification helpers
│
├── hooks/
│   └── useColors.ts              # Theme-aware color hook
│
├── constants/
│   └── colors.ts                 # Dark + light theme color tokens
│
├── assets/
│   └── images/                   # App icon, splash
│
├── app.json                      # Expo config (name, slug, version)
├── eas.json                      # EAS build profiles
└── package.json
```

---

## Data Layer

### SQLite Tables (Native)

```sql
-- All user expenses
expenses (id, amount, category, description, date, is_recurring, source_id)

-- Bank accounts / wallets
accounts (id, name, type, balance, icon, color)

-- Monthly budget config
budgets (id, total_amount, category_limits JSON)

-- Finance tasks / reminders
tasks (id, title, deadline, completed, created_at)

-- Savings goals
savings_goals (id, name, target_amount, current_amount, deadline)

-- Quick-add templates
templates (id, name, amount, category)

-- Given / taken loans
loans (id, person_name, amount, type, date, note, settled)

-- App-level key-value settings
settings (key, value)
    ├── user_name
    ├── is_onboarded
    ├── pin
    ├── streak
    ├── last_month
    ├── notif_prefs       (JSON)
    ├── notified_thresholds  (JSON — persisted alert history)
    ├── privacy_mode
    └── profile_photo
```

### Web Fallback (AsyncStorage)

When running in a browser or web fallback mode, all data is stored in `AsyncStorage` as JSON under namespaced keys (`@ft_*`).

---

## State Management

Everything lives in a single `AppContext` (React Context + `useReducer`-style callbacks). No Redux or Zustand needed at this scale.

```
AppContextType
│
├── Data
│   ├── expenses[]         All time expenses
│   ├── budget             { totalAmount, categoryLimits }
│   ├── accounts[]         Bank accounts and wallets
│   ├── loans[]            Given/taken money records
│   ├── tasks[]            Finance reminders
│   ├── savingsGoals[]     Savings targets
│   └── templates[]        Quick-add templates
│
├── UI State
│   ├── isPrivacyMode      Hide/show all amounts
│   ├── isLocked           PIN lock active
│   ├── isLoaded           Data hydration complete
│   └── userName / profilePhoto
│
├── Computed Getters
│   ├── getMonthExpenses() → Expense[]
│   ├── getCategoryTotal() → number
│   ├── getTotalSpent()    → number
│   ├── getTotalBalance()  → number
│   ├── getInsights()      → string[]   (smart tips)
│   └── getMonthlyTotals() → MonthlyTotal[]  (6-month trend)
│
└── Actions
    ├── addExpense / updateExpense / deleteExpense
    ├── updateBudget
    ├── addLoan / updateLoan / deleteLoan
    ├── addSavingsGoal / updateSavingsGoal / deleteSavingsGoal
    ├── addTask / updateTask / deleteTask
    ├── addAccount / updateAccount / deleteAccount
    ├── togglePrivacyMode
    ├── updateUserName / updateProfilePhoto
    ├── setPin / unlockWithPin
    ├── exportCSV
    └── completeOnboarding
```

---

## Screens & Components

### Home Screen (`index.tsx`)
```
┌────────────────────────────┐
│  Good evening, Arjun 👋   │  ← Greeting + privacy eye toggle
│                            │
│    [Budget Ring — SVG]     │  ← Animated donut: ₹8.2K / ₹15K
│     ₹8,200 spent           │
│     ₹6,800 left            │
│                            │
│  SPENDING BY CATEGORY      │
│  Food      ████████░ ₹4.1K │  ← Progress bars per category
│  Transport ████░░░░░ ₹2.1K │
│                            │
│  SAVINGS GOALS             │
│  [← Bike ──60%──  →]      │  ← Horizontal scroll carousel
│                            │
│  GIVEN / TAKEN             │
│  → Rahul    ₹500 (Given)   │  ← Green / amber loan cards
│  ← Priya    ₹200 (Taken)   │
│                            │
│  RECENT EXPENSES           │
│  Zomato      ₹340  Food    │  ← Tap to reveal edit/delete
│  Ola         ₹120  Travel  │
│                            │
└────────────────────────────┘
```

### Analytics Screen (`analytics.tsx`)
```
┌────────────────────────────┐
│  MONTHLY TRENDS            │
│  ▓             ▓           │  ← Tap any bar to filter pie
│  ▓ ▓     ▓ ▓  ▓  ▓        │
│  Nov Dec Jan Feb Mar Apr   │
│                            │
│  CATEGORY BREAKDOWN (Pie)  │
│       🔵 Food 50%          │
│       🟢 Travel 25%        │
│       🟡 Shopping 15%      │
│                            │
│  WEEKLY SPENDING (Bars)    │
│  Mon ████ ₹480             │
│  Tue ██   ₹200             │
│                            │
│  BUDGET VS ACTUAL          │
│  Food  [████████░░] 80%    │
│                            │
└────────────────────────────┘
```

### AI Assistant (`assistant.tsx`)
```
┌────────────────────────────┐
│  AI Finance Assistant 🤖   │
│  "Aapka financial dost"    │
│                            │
│  ┌──────────────────────┐  │
│  │ Food pe is mahine    │  │
│  │ ₹4.1K kharch hua —  │  │
│  │ budget ka 82% hai.   │  │  ← Hinglish, context-aware
│  │ Thoda control karo!  │  │     Uses real spending data
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ > kitna bacha hai?   │  │  ← User message
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ ₹6,800 bacha hai     │  │
│  │ is mahine. Mast!     │  │
│  └──────────────────────┘  │
│                            │
│  [Ask something...]  Send  │
└────────────────────────────┘
```

### BudgetRing Component (`BudgetRing.tsx`)

An animated SVG donut ring that fills proportionally to spending.

```
        ╔═══════╗
      ╔═╝       ╚═╗
     ║  ₹8,200    ║   ← Spent (center text)
     ║   spent    ║
      ╚═╗       ╔═╝
  ▓▓▓▓▓▓╚═══╗  ╔╝░░░░░
             ╚══╝
   ▓ = spent (primary blue)
   ░ = remaining (muted)
```

- Built with `react-native-svg`
- Animated with `react-native-reanimated` spring animation
- Shows spent amount + percentage inside

---

## Indian-Specific Features

### Auto-Categorization

Typing a merchant name in the description field automatically selects the right category:

| Merchant Keywords | Category |
|---|---|
| zomato, swiggy, blinkit, dunzo | Food |
| ola, uber, rapido, irctc, redbus | Transport |
| paytm, phonepe, gpay, mobikwik | Bills |
| flipkart, amazon, myntra, meesho | Shopping |
| byju, unacademy, coursera | Education |
| apollo, medplus, 1mg | Health |
| netflix, hotstar, spotify | Entertainment |

### Currency Formatting

```typescript
fmt(340)      // → "₹340"
fmt(4100)     // → "₹4.1K"
fmt(150000)   // → "₹1.5L"
fmtFull(340)  // → "₹340.00"
fmtHidden(340)// → "₹****"  (Privacy Mode)
```

### Default Budget

- Total: ₹15,000/month
- Food: ₹4,000 · Transport: ₹2,000 · Shopping: ₹2,000
- Entertainment: ₹1,500 · Health: ₹1,500 · Education: ₹1,000
- Bills: ₹2,000 · Misc: ₹1,000

---

## Notification System

Budget threshold alerts that fire **once per month** and never repeat after restart.

```
User adds expense
       │
       ▼
Check category budget %
       │
       ├── ≥ warningThreshold% (default 80%)
       │         └── "Food budget at 80%" alert
       │         └── Save "Food-80" to SQLite + AsyncStorage
       │
       └── ≥ 100%
                 └── "Food budget exceeded!" alert
                 └── Save "Food-100" to SQLite + AsyncStorage

App restarts (same month)
       │
       └── Load persisted alert keys from storage
                 └── Skip already-fired alerts ✅

New month starts
       └── Clear all stored threshold keys
                 └── Alerts fire fresh next month ✅
```

Custom warning threshold: configurable from Settings (50%–95%, in 5% steps).

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Expo (React Native) | SDK 54 |
| Language | TypeScript | 5.x |
| Navigation | Expo Router | ~4.x |
| Storage (Native) | expo-sqlite | ~15.x |
| Storage (Web) | @react-native-async-storage | ~2.x |
| Animations | react-native-reanimated | ~4.1 |
| Charts | react-native-svg | 15.x |
| Icons | @expo/vector-icons | 14.x |
| Haptics | expo-haptics | ~14.x |
| Notifications | expo-notifications | ~0.32 |
| Image Picker | expo-image-picker | ~17.x |
| File Export | expo-file-system + expo-sharing | ~19.x + ~14.x |
| Fonts | @expo-google-fonts/inter | latest |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Expo Go](https://expo.dev/go) on your phone

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install all dependencies
pnpm install

# Start the Expo dev server
pnpm --filter @workspace/mobile run dev
```

Scan the QR code in the terminal with Expo Go to run on your phone instantly.

---

## Build the APK

### Option A: EAS Cloud Build (No Android Studio needed)

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Navigate to mobile folder
cd artifacts/mobile

# Configure (first time only)
eas build:configure

# Build APK
eas build -p android --profile preview
```

Download the `.apk` link when build finishes → sideload on your phone.

### Option B: Local Build (Android Studio required)

```bash
# Generate native Android project
cd artifacts/mobile
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

> Full step-by-step guide in [BUILD_APK.md](./BUILD_APK.md)

---

## Publish to Play Store

```
1. eas build -p android --profile production  →  generates .aab file
2. Create account at play.google.com/console  ($25 one-time fee)
3. Create app listing → fill name, description, screenshots
4. Upload .aab → Production → Create release
5. Complete content rating + add privacy policy URL
6. Submit for review (1–7 days)
```

---

## Publish to App Store

```
1. Apple Developer account ($99/year) + Mac required
2. eas build -p ios --profile production
3. eas submit -p ios
4. Fill metadata at appstoreconnect.apple.com
5. Submit for review (1–3 days)
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run type check: `cd artifacts/mobile && npx tsc --noEmit`
5. Push and open a Pull Request

---

## License

MIT — free to use, modify, and distribute.
