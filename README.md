# BookWorm — Frontend

React Native (Expo) mobile app for the BookWorm e-book marketplace. Browse, buy, rent, and read books.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| HTTP | Axios |
| Auth | JWT (SecureStore) |
| Build | EAS Build |

## Project Structure

```
frontend/
├── app/                     # Expo Router pages
│   ├── (tabs)/              # Bottom tab screens (Home, Library, Profile)
│   ├── book/                # Book detail & reader
│   ├── category/            # Category listing
│   ├── admin/               # Admin panel
│   ├── my-books/            # User library
│   ├── profile/             # Edit profile
│   ├── index.tsx            # Landing / splash
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Sign up screen
│   ├── verify-otp.tsx       # OTP verification
│   ├── set-password.tsx     # Set password
│   ├── pick-favorites.tsx   # Genre selection
│   └── notifications.tsx    # Notifications
├── src/screens/             # Screen components
│   ├── Auth/                # Auth screens (Login, Signup, OTP, SetPassword)
│   └── Profile/             # Edit profile screen
├── components/              # Shared components
├── constants/
│   └── Config.js            # API URL config
├── hooks/                   # Custom hooks
├── assets/                  # Images, fonts
├── app.json                 # Expo config
└── eas.json                 # EAS Build profiles
```

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Expo dev server
npx expo start

# 3. Scan QR with Expo Go app, or press:
#    a → open Android emulator
#    i → open iOS simulator
```

> **API URL**: By default, the app connects to `http://192.168.1.3:8000` (local backend).  
> To change, set `EXPO_PUBLIC_API_URL` environment variable or edit `constants/Config.js`.

## Build APK (via EAS)

```bash
# Preview build (internal testing)
eas build -p android --profile preview

# Production build (points to AWS ALB backend)
eas build -p android --profile production
```

The production build reads `EXPO_PUBLIC_API_URL` from `eas.json`:
```json
"production": {
    "env": {
        "EXPO_PUBLIC_API_URL": "http://book-back-1848382782.us-east-2.elb.amazonaws.com"
    }
}
```

## Environment Config

| Profile | API URL Source | Value |
|---|---|---|
| Local dev | Fallback in `Config.js` | `http://192.168.1.3:8000` |
| Preview | Default fallback | Local IP |
| Production | `eas.json` env | ALB DNS |

## Key Features

- OTP + Password authentication
- Browse & search books by category
- Buy / Rent books with merchant approval
- In-app PDF reader with progress tracking
- Bookmarks & reviews
- Profile management with photo upload
- Push notifications
- Merchant registration
