# OwlPilot

OwlPilot is a class-schedule app for Kennesaw State students. You tell it your major, the courses you want and when you can (or can't) take classes. It then builds conflict-free schedules from real Spring 2027 sections, ranks them by professor ratings, and explains the trade-offs in plain language. After you accept a schedule it shows your upcoming classes, walking directions to the building, and a camera tool ("Find My Class") that reads a room sign and guides you to your classroom inside Building Q.

## Features

- Guided setup: academic profile, course selection with degree-plan recommendations, schedule preferences and busy times
- Plain-code scheduler: no overlaps, busy times, online limits, waitlist handling and three strategies (Best, Best Professors, Fewest Days) plus "Find another"
- Gemini-powered notes parsing, professor review summaries and a "Why this schedule?" explanation, all through our own server so the API key never ships in the app
- Mini academic advisor ("Swap the course") and prerequisite warnings based on the KSU degree plan
- Home screen with "Up Next" class, weekly class list, Google Maps walking directions, CRN copy/email
- Find My Class: photograph a room sign, Gemini reads it, and Dijkstra routing over a real map of Building Q gives step-by-step directions

## Tech stack

- **App:** React Native + Expo (TypeScript), React Navigation, run in Expo Go
- **Server:** Node.js + Express (CommonJS), Google Gemini REST API
- **Design:** Figma, fonts Outfit and Manrope

## Folder structure

```
.
├── app/                     Expo / React Native app (TypeScript)
│   ├── App.tsx              Fonts, splash, navigation stack
│   ├── assets/              Icons, logo, owl animation
│   ├── scripts/             Node scripts: scheduler, navigation and demo tests
│   └── src/
│       ├── api.ts           Only place the app talks to our server
│       ├── navigation.ts    Route names and params
│       ├── theme.ts         Colors, fonts, shadow
│       ├── components/      Reusable UI (buttons, chips, cards, tab bar)
│       ├── context/         Shared student profile (React Context)
│       ├── data/            KSU sections, professors, reviews, degree plan, Building Q map
│       ├── logic/           Scheduler, advisor, prerequisites, indoor routing, helpers
│       ├── mock/            Degree plans used for recommendations
│       └── screens/         One file per screen
├── server/                  Express API that calls Gemini
│   └── index.js
├── .claude/                 Claude Code settings, hooks and skills used during development
├── .env.example             Environment variable template
└── CLAUDE.md                Detailed project notes
```

## Run it

Needs Node.js and the Expo Go app on a phone (phone and computer on the same Wi-Fi).

```bash
# 1. server (port 3000)
cd server && npm install && npm start

# 2. app (in a second terminal)
cd app && npm install && npx expo start    # scan the QR code with Expo Go
```

Checks: `cd app && npx tsc --noEmit`, `npm run test:scheduler`, `npm run test:navigation`. Server health: `curl localhost:3000/health`.

## Environment variables

Copy the template in `.env.example` into these git-ignored files:

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `GEMINI_API_KEY` | Gemini key (server only) |
| `server/.env` | `PORT`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Optional |
| `app/.env` | `EXPO_PUBLIC_API_URL` | Your computer's Wi-Fi IP, e.g. `http://10.0.0.45:3000` (not `localhost`) |

## Data sources

- **Owl Express** snapshot of Spring 2027 sections (801 sections, 57 courses), in `app/src/data/sections.json`
- **Rate My Professors** ratings and reviews for KSU professors, in `app/src/data/professors.json` and `reviews.json`
- KSU BS Computer Science 2025 degree plan sheet (`degreePlan.json`) and Building Q evacuation plans (`buildingQ.json`)

See `app/src/data/README.md` for the file formats.

## Credits

- [Expo](https://expo.dev), [React Native](https://reactnative.dev), [React Navigation](https://reactnavigation.org), [Express](https://expressjs.com)
- [Google Gemini API](https://ai.google.dev)
- Fonts: [Outfit](https://fonts.google.com/specimen/Outfit) and [Manrope](https://fonts.google.com/specimen/Manrope) (SIL Open Font License)
- Data: Kennesaw State University Owl Express, Rate My Professors

## Team

- Aiya Bakhithanova
- Diana Kramska
