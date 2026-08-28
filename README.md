# Flexi Agency — mobile

Bare React Native (0.86, New Architecture) app for the Flexi Agency travel and
delivery platform. It shares its design system, domain vocabulary and API with
`travel-frontend`; it is a second client, not a second product.

## Running it

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios          # debug build + Metro
npx react-native run-ios --mode Release   # embedded bundle, real launch feel
```

The dev build talks to `http://localhost:3001/api/v1` — where `travel-backend`
runs. Release builds point at production. Both live in `lib/config.ts`; a
physical device cannot reach your machine's localhost, so point it at the LAN
address the API listens on.

Android is configured (icons, fonts, bootsplash resources, applicationId) but
has not been built or verified yet — expect to finish the bootsplash
MainActivity/theme wiring before the first run.

## How it is arranged

| Path | What lives there |
|---|---|
| `theme/tokens.ts` | The design system, ported 1:1 from the website's `globals.css` |
| `lib/config.ts` | API + site origins, per build flavour |
| `lib/api.ts` | Every call to `/api/v1`; session token in the device keychain |
| `lib/cart.tsx` | The restaurant basket, persisted across launches |
| `lib/photos.ts` | Bundled city photography (the website's own destination images) |
| `components/ui/` | Text, Pressable, Button, Sheet, Surface, Skeleton, Gradient |
| `components/Splash.tsx` | The launch choreography (takes over from bootsplash seamlessly) |
| `navigation/types.ts` | Typed route params for the whole tree |
| `screens/` | One file per screen; navigation is a native stack over four tabs |

## Booking and deep links

Every vertical books through the same `POST /orders` the website uses: rooms
by `roomTypeId + startDate/endDate`, everything else by `listingId` (+ dates
for car hire). `PROPERTY` is enquiry-only — the server refuses to sell it —
so property cards offer a call and the enquiry form instead of a Book button.
Hotel availability is only honest for a dated stay: `GET /hotels/:slug?from&to`
re-prices per night, and the dateless number is the tightest night in the
whole calendar (everything reads sold out) — never gate on it without dates.

Deep links: `flexiagency://` plus `https://flexiairbnb.com` paths
(`hotels/:slug`, `restaurants/:slug`, `orders/:reference`, `login`) are mapped
in `App.tsx`. Universal links wait on an AASA file server-side; the custom
scheme works today.

## Things learned the hard way

**Gradients are fills, never containers.** `react-native-linear-gradient` goes
through Fabric's legacy interop here and, used as a layout container, applied
its padding as margin and pushed children out of bounds. Every gradient in the
app is drawn by `components/ui/Gradient.tsx` (react-native-svg) inside a plain
View that owns the layout.

**No `entering`/`exiting` layout animations on tappable containers.** A view
mounted through Reanimated's entering API can come up with broken hit-testing
on this RN pairing — the cart bar rendered but took no touches. Animate
visibility with shared values (`useAnimatedStyle`), the way `Reveal` and
`CartBar` do.

**`runOnJS` takes your own function, not a native-module static.** Passing
`StatusBar.setBarStyle` directly aborted the worklets runtime the moment the
screen header mounted. Wrap the call in a `useCallback` first.

**Fonts resolve by PostScript name.** The TTFs in `assets/fonts` are named
exactly by their PostScript names (`Inter-SemiBold`, `Fraunces-Bold`…), which
is the one identifier iOS and Android agree on. Rename a file and iOS silently
falls back to the system font.

**A gorhom sheet positions inside its parent.** Declared inside a card it
opens clipped to that card. Screen-level sheets are fine; the one picker that
must live inside arbitrary forms (`PhoneField`'s country list) is an RN
`Modal` styled as a sheet instead.

**Seven percent-width cells wrap.** `width: "${100/7}%"` rounds past 100% and
the seventh calendar column wraps to the next line; `14.28%` leaves slack.

**Sessions slide.** The API renews a session on any request more than a day old
and returns the fresh token in `X-Session-Token`; `lib/api.ts` stores it
silently. That is what keeps a returning customer from paying Twilio for a new
OTP every seven days.
