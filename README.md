# Finance Tracker 💰

A full-featured personal finance tracker mobile app built for Indian college students. Track expenses, manage budgets, monitor loans (given/taken), and chat with an offline AI assistant — all in ₹.

---

## Features

- **₹ Currency** — Indian Rupee throughout, with ₹XK / ₹XL formatting
- **Home Dashboard** — Budget ring, category spending bars, savings goals, loans summary
- **Add Expense** — Minimal, fast entry with Indian merchant auto-categorization (Zomato, Swiggy, Ola, Paytm, etc.)
- **Analytics** — Category pie chart, weekly bar chart, 6-month spending trends
- **Transaction History** — Search, filter by category/date, sort by amount or date
- **Tasks** — Finance reminders with deadline countdown
- **AI Assistant (Hinglish)** — Offline-first, context-aware chat about your spending
- **Given/Taken Loans** — Track money you lent or borrowed with settle/edit/delete
- **Privacy Mode** — Hide all balances with one tap
- **Savings Goals** — Set targets and track progress
- **PIN Lock** — 4-digit app lock for privacy
- **CSV Export** — Export all expenses for external analysis
- **Smart Notifications** — Budget threshold alerts (80% / 100%) that don't repeat

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (React Native) |
| Navigation | Expo Router (file-based) |
| Storage | expo-sqlite (native) / AsyncStorage (web) |
| UI | Custom components + react-native-svg |
| Animations | React Native Reanimated |
| Icons | @expo/vector-icons (Ionicons) |
| Language | TypeScript |

---

## Getting Started (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- [pnpm](https://pnpm.io) — install with `npm install -g pnpm`
- [Expo Go](https://expo.dev/go) app on your phone

### Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
pnpm install
```

### Run the App

```bash
pnpm --filter @workspace/mobile run dev
```

This starts the Expo development server. A QR code will appear in the terminal.

---

## Using on Your Android Phone (No Publishing Required)

This is the easiest way to test the app on a real Android device.

### Method 1: Expo Go App (Fastest — 2 minutes)

1. Install **Expo Go** from the [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Run `pnpm --filter @workspace/mobile run dev` on your computer
3. Make sure your phone and computer are on the **same Wi-Fi network**
4. Open Expo Go → tap **"Scan QR Code"**
5. Scan the QR code shown in your terminal
6. The app opens instantly on your phone ✅

> Works great for testing. The app reloads automatically when you change code.

---

### Method 2: Build a Standalone APK (Install like a normal app)

This creates a real `.apk` file you can install on any Android phone — no Play Store needed.

**Step 1: Install EAS CLI**
```bash
npm install -g eas-cli
eas login
```

**Step 2: Create an Expo account**
Sign up free at [expo.dev](https://expo.dev)

**Step 3: Configure the build**
```bash
cd artifacts/mobile
eas build:configure
```

**Step 4: Build the APK**
```bash
eas build -p android --profile preview
```

- Choose **"APK"** when asked (not AAB) — APK can be sideloaded directly
- The build runs in the cloud (free tier available)
- Takes ~10-15 minutes
- You'll get a download link when done

**Step 5: Install on your phone**
1. Download the `.apk` file to your Android phone
2. Go to **Settings → Security → Install unknown apps** → enable for your browser
3. Open the downloaded APK file → tap **Install**
4. Done! The app is installed like any other app ✅

> **Tip:** Share the APK link with friends to let them install it too.

---

## Using on an iPhone (iOS)

### Method 1: Expo Go App

Same as Android — install [Expo Go from the App Store](https://apps.apple.com/app/expo-go/id982107779), scan the QR code.

### Method 2: TestFlight (for sharing with others)

1. You need a Mac with Xcode and an Apple Developer account ($99/year)
2. Build with EAS: `eas build -p ios --profile preview`
3. Submit to TestFlight: `eas submit -p ios`
4. Invite testers via email through App Store Connect
5. Testers install TestFlight and then your app

---

## Publishing on Google Play Store

### Step 1: Create a Google Play Developer account
- Go to [play.google.com/console](https://play.google.com/console)
- Pay the one-time $25 registration fee
- Fill in developer profile

### Step 2: Build a release AAB (Android App Bundle)
```bash
cd artifacts/mobile
eas build -p android --profile production
```

This creates an `.aab` file (the format Play Store requires).

### Step 3: Create your app listing on Play Console
- Click **"Create app"** in Play Console
- Fill in: App name, description, screenshots, category
- Upload a 512×512 icon and a 1024×512 feature graphic

### Step 4: Upload your build
- Go to **Production → Create new release**
- Upload the `.aab` file from Step 2
- Write release notes

### Step 5: Fill in required sections
Play Store requires you to complete:
- **Content rating** — answer the questionnaire
- **Target audience** — select age group
- **Privacy policy** — you need a URL to a privacy policy page
- **App access** — mark as "All functionality available without special access"

### Step 6: Submit for review
- Click **"Send for review"**
- Google review takes 1-7 days for new apps
- You'll get an email when approved

---

## Publishing on Apple App Store

1. Build: `eas build -p ios --profile production`
2. Submit: `eas submit -p ios`
3. Log in to [App Store Connect](https://appstoreconnect.apple.com)
4. Fill in metadata, screenshots, and pricing
5. Submit for review (1-3 days typically)

> **Note:** Apple Developer account costs $99/year and requires a Mac for local builds.

---

## Project Structure

```
artifacts/mobile/
├── app/
│   ├── (tabs)/          # Main tab screens
│   │   ├── index.tsx    # Home dashboard
│   │   ├── analytics.tsx
│   │   ├── tasks.tsx
│   │   └── assistant.tsx # AI chat (Hinglish)
│   ├── settings.tsx
│   ├── transactions.tsx # Full history with search/filter
│   └── setup.tsx        # Onboarding
├── components/          # Reusable UI components
├── context/
│   └── AppContext.tsx    # All app state + SQLite persistence
├── db/                  # SQLite schema and migrations
├── utils/
│   └── currency.ts      # ₹ formatting helpers
└── constants/
    └── colors.ts        # Dark/light theme colors
```

---

## License

MIT — free to use, modify, and distribute.
