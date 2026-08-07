# FitMomGuide

PWA for working moms: capture body stats (manual + smart-scale upload), then generate a **custom monthly plan** with weekly **meals**, **home workouts**, and **grocery lists** (Best / Budget / Cleanest) that open in **Blinkit**.

## Stack

- Next.js (App Router) + TypeScript + PWA (manifest + service worker)
- Firebase Auth (Google + Phone OTP), Firestore, Storage
- Gemini for stats parse + monthly plan generation
- Next.js API routes for local/dev generation; Cloud Functions in `functions/` for production deploy

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Firebase env vars you can use **Continue in demo mode** (localStorage). Without `GEMINI_API_KEY`, plan generation uses a built-in mock month so the UI is fully walkable.

## Google / Firebase setup

1. Create a Firebase project (`FitMomGuide`).
2. Enable **Authentication** providers: **Google** and **Phone**.
3. Create a **Web** app and copy config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
4. Enable **Firestore**, **Storage**, and (optional) **Functions**.
5. Add authorized domains (`localhost` + your deploy host).
6. Phone OTP: enable reCAPTCHA; add test phone numbers for development.
7. Create a Gemini API key in Google AI Studio → set `GEMINI_API_KEY` in `.env.local`.
8. For production functions:
   ```bash
   cd functions && npm install && npm run build
   firebase functions:secrets:set GEMINI_API_KEY
   firebase deploy --only functions
   ```

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Branded landing |
| `/sign-in` | Google + phone |
| `/verify-otp` | Phone OTP |
| `/onboarding` | Diet, cuisine, workout prefs |
| `/stats` | Manual fields + upload → confirm → generate |
| `/plan` | Month overview (4 weeks) |
| `/plan/week/[n]` | Meals / Workouts / Grocery + Add in Blinkit |
| `/profile` | Prefs + sign out |

## PWA

- `public/manifest.webmanifest`
- `public/sw.js` (registered client-side)
- Icons in `public/icons/`

On mobile Chrome/Safari, use **Add to Home Screen** after deploying over HTTPS.

## Blinkit

Grocery brand options call `https://blinkit.com/s/?q=…`. There is no cart API in MVP — the user finishes add-to-cart inside Blinkit. If the window cannot open, the search query is copied to the clipboard.
