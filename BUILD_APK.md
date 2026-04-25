# How to Build the APK

Two ways to build a standalone `.apk` file — no Expo Go required.

---

## Option A: EAS Cloud Build (Recommended)

Build in the cloud. No Android Studio needed. Works from VS Code terminal.

### Step 1 — Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2 — Create a free Expo account
Sign up at [expo.dev](https://expo.dev)

### Step 3 — Log in
```bash
eas login
```

### Step 4 — Navigate to the mobile folder
```bash
cd artifacts/mobile
```

### Step 5 — Configure EAS (first time only)
```bash
eas build:configure
```
- Select **Android** when prompted
- This creates an `eas.json` file in the folder

### Step 6 — Build the APK
```bash
eas build -p android --profile preview
```
- Press **Y** when asked to generate a new Android Keystore
- Build runs on Expo's servers — takes about 10–15 minutes
- When done, you get a **download link** for the `.apk` file

### Step 7 — Install on your phone
1. Download the `.apk` to your Android phone
2. Go to **Settings → Security → Install unknown apps**
3. Allow installs from your browser or file manager
4. Tap the APK file → **Install**
5. App is now installed like any normal app ✅

---

## Option B: Local Build with Android Studio

Builds entirely on your machine. No internet needed after initial setup.

### Step 1 — Install Android Studio
Download from [developer.android.com/studio](https://developer.android.com/studio)

During installation, make sure to install:
- Android SDK
- Android SDK Build-Tools
- Android SDK Platform (API 34 or higher)

### Step 2 — Set environment variables

**Windows** (add to System Environment Variables or run in PowerShell):
```powershell
$env:ANDROID_HOME = "C:\Users\YOUR_NAME\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\tools"
```

**Mac / Linux** (add to `~/.bashrc` or `~/.zshrc`):
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

Then restart your terminal.

### Step 3 — Install Java JDK 17
Download from [adoptium.net](https://adoptium.net)
> Android Studio may install this automatically. Check with `java -version`.

### Step 4 — Install project dependencies
```bash
cd artifacts/mobile
pnpm install
```

### Step 5 — Generate the native Android project
```bash
npx expo prebuild --platform android
```
This creates an `android/` folder inside `artifacts/mobile/`.

### Step 6 — Build the APK
```bash
cd android
./gradlew assembleRelease
```

On Windows use:
```bash
gradlew.bat assembleRelease
```

### Step 7 — Find your APK
The built APK will be at:
```
artifacts/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Copy it to your phone and install it the same way as Option A (Step 7).

---

## Comparison

| | EAS Cloud Build | Local Build |
|---|---|---|
| Setup time | ~5 minutes | 1–2 hours |
| Requires Android Studio | No | Yes |
| Requires internet to build | Yes | No (after setup) |
| Build time | 10–15 min | 5–10 min |
| Best for | Quick sharing | Full offline control |

---

## Publishing to Play Store (when ready)

1. Build an **AAB** instead of APK (Play Store requires this format):
   ```bash
   eas build -p android --profile production
   ```
2. Create a developer account at [play.google.com/console](https://play.google.com/console) (one-time $25 fee)
3. Create a new app listing — fill in name, description, screenshots
4. Upload the `.aab` file under **Production → Create new release**
5. Complete the content rating questionnaire and add a privacy policy URL
6. Submit for review — Google typically takes 1–7 days for new apps

---

## Publishing to Apple App Store

1. Requires an **Apple Developer account** ($99/year) and a Mac
2. Build for iOS:
   ```bash
   eas build -p ios --profile production
   ```
3. Submit to App Store Connect:
   ```bash
   eas submit -p ios
   ```
4. Fill in metadata at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
5. Submit for review — usually 1–3 days

---

## Using on iPhone Without Publishing (Free)

1. Install **Expo Go** from the [App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Run the dev server on your computer:
   ```bash
   pnpm --filter @workspace/mobile run dev
   ```
3. Make sure your phone and computer are on the **same Wi-Fi**
4. Open Expo Go → scan the QR code from the terminal
5. App runs on your iPhone instantly ✅
