# Flexi Agency — mobile

React Native (Expo SDK 57) app for the Flexi Agency travel and delivery
platform. It shares its design system, domain vocabulary and API with
`travel-frontend`; it is a second client, not a second product.

## Running it

```bash
npm install
npx expo prebuild --platform ios     # or --platform android
npx expo run:ios                     # builds, installs, starts Metro
```

Point it at an API by editing `expo.extra.apiBaseUrl` in `app.json`. It
defaults to `http://localhost:3001/api/v1`, which is where `travel-backend`
runs in development.

A simulator cannot reach `localhost` on another machine — for a physical
device, set that value to the LAN address the API is listening on.

## How it is arranged

| Path | What lives there |
|---|---|
| `theme/tokens.ts` | The design system, ported 1:1 from the website's `globals.css` |
| `lib/api.ts` | Every call to `/api/v1`; session token in the device keychain |
| `lib/cart.tsx` | The restaurant basket, persisted across launches |
| `lib/prefs.tsx` | Locale and currency |
| `components/ui/` | Text, Pressable, Button, Sheet, Surface, Skeleton |
| `components/Splash.tsx` | The launch sequence |
| `app/` | Routes (expo-router, file-based) |

## Two things worth knowing

**Sessions slide.** The API renews a session on any request more than a day
old and returns the new token in `X-Session-Token`; `lib/api.ts` stores it
silently. That is what stops the app asking for an SMS code every seven days —
each one costs real money at Twilio.

**Images can be relative.** The catalogue stores absolute URLs for uploaded
media and root-relative paths for the placeholder artwork the website ships
with. A browser resolves the second against its origin; a native app cannot, so
everything goes through `lib/media.ts`.
