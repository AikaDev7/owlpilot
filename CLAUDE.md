# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OwlPilot is a class-schedule app built for a hackathon. It has two independent npm projects with no shared root `package.json`:

- `app/`: React Native + Expo (TypeScript), run in **Expo Go** (no native builds, so only Expo Go-compatible packages).
- `server/`: small Express (CommonJS) API. It is the only thing that talks to Gemini, so the API key never ships in the app.

The UI is designed in Figma (file key `22ozX0doqUgl5Svih1DqjR`, page "Page 1"). Use the Figma MCP to read frames before building a screen. Built so far: Splash, Welcome, About You (Step 1, Academic Profile), and placeholder Select Courses (Step 2) and Home screens.

## Commands

```bash
# server (port 3000, or PORT from server/.env)
cd server && npm install && npm start

# app
cd app && npm install
npx expo start          # scan the QR code with Expo Go; add -c to clear the cache after editing app/.env
npx tsc --noEmit        # typecheck (the only check; there is no test or lint setup)
npx expo install <pkg>  # always use this instead of npm install, so versions match the Expo SDK
```

No tests exist. Smoke-test the server with `curl localhost:3000/health`.

## Architecture

**Request flow:** app screen → `app/src/api.ts` (`askGemini`) → `POST {EXPO_PUBLIC_API_URL}/api/ask` → `server/index.js` → Gemini REST API (`generateContent`, key sent in the `x-goog-api-key` header). The app must never call Gemini or any third-party API directly; add new endpoints to `server/index.js` and a wrapper function in `app/src/api.ts`.

**Environment files** (all git-ignored except `.env.example`, and `.claude/settings.json` denies reading any `.env`):
- `server/.env`: `GEMINI_API_KEY`, optional `PORT`, optional `GEMINI_MODEL` (default `gemini-2.5-flash`). The user pastes the key themselves; never ask for it.
- `app/.env`: `EXPO_PUBLIC_API_URL`. It must be the computer's Wi-Fi IP (e.g. `http://10.0.0.45:3000`), not `localhost`, because Expo Go runs on a phone. Only `EXPO_PUBLIC_*` variables reach the app bundle, so never put secrets there.

**Navigation:** React Navigation native stack, defined in `app/App.tsx`. Route names and their params live in `RootStackParamList` in `app/src/navigation.ts`. To add a screen, add it to that type, register a `Stack.Screen` in `App.tsx`, and type its props with `NativeStackScreenProps<RootStackParamList, "Name">`. `Splash` uses `navigation.replace("Welcome")` after 2 seconds so Back doesn't return to it. Flow so far: Splash → Welcome → AboutYou → SelectCourses.

**Fonts and theme:** `App.tsx` loads the fonts with `useFonts` and holds the native splash (`expo-splash-screen`) until they're ready. The font keys in `app/src/theme.ts` (`fonts.title`, `fonts.body`, ...) must match the names loaded in `App.tsx`; when you need a new weight, import it in both places. Use **Outfit** for headers and titles and **Manrope** for everything else, as in the Figma design. Poppins appears in Figma only on one old title layer and a notes frame, so don't use it. Colors come from `theme.ts` (yellow `#FFC629`, black, white, light gray `#F5F5F5`), so don't hardcode hex values in screens.

**Shared profile data:** `app/src/context/ProfileContext.tsx` is a plain React Context (`ProfileProvider` wraps the navigator in `App.tsx`; read it with `useProfile()` → `{ profile, setProfile }`). `Profile` holds `major`, `year` (Freshman/Sophomore/Junior/Senior), `startYear`, `gradYear` (numbers) and `takenCourses` (course *codes* like `"CS 1301"`). Fields are `null`/`[]` until AboutYou saves them on Continue.

**About You screen (`AboutYouScreen.tsx`):** major is prefilled from the Welcome route param and validated against `majors` like Welcome. Year uses `Chip`s; start year (2020–2027) and graduation use `Dropdown`. Graduation options are start year to start year + 8 and the dropdown is disabled until a start year is chosen. If a new start year is after the chosen graduation year, graduation is cleared and a red "Graduation year can’t be before your start year." shows. Previously taken courses (optional) come from `src/mock/courses.ts` (`courses`, `courseLabel`); picking one adds a `RemovableChip`, and added courses are hidden from the search list. Continue requires major, year, start year and graduation year; otherwise red errors show and it doesn't navigate.

**Component notes:** `Dropdown` (modal list, `error`/`disabled` props), `RemovableChip` (gray pill with "x"). `SearchSelect` has `emptyText` and a `clearOnPick` mode (picking calls `onSelect` and empties the box; typing never picks) for multi-add lists. `Chip` takes a `style` prop and `PrimaryButton` an `arrow` prop.

## Conventions

Keep code simple and student-level: plain `StyleSheet`, `useState`/`useEffect`, no state or UI libraries. Screens go in `app/src/screens/`.

All new screens must use `src/theme.ts` (colors, fonts, shadow) and the reusable components in `src/components/` (`PrimaryButton`, `SearchInput`, `SearchSelect`, `Chip`, `StepHeader`, `SectionTitle`) instead of hardcoding styles. Add any missing color to `theme.ts`. Wrap every form screen in `ScreenContainer` so the keyboard never covers inputs and tapping outside closes it.
