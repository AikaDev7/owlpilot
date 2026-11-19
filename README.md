# OwlPilot

React Native + Expo (TypeScript) app, plus a small Express server that calls Gemini so no API key lives in the app.

## Setup (once)
1. `cd server && npm install`
2. Put your key in `server/.env`:  `GEMINI_API_KEY=...` (see `.env.example`)
3. `cd app && npm install`
4. Put your computer's Wi-Fi IP in `app/.env`:  `EXPO_PUBLIC_API_URL=http://<ip>:3000`
   (find it with `ipconfig getifaddr en0` on Mac)

## Run
- Server: `cd server && npm start`
- App: `cd app && npx expo start`, then scan the QR code with Expo Go (phone and computer on the same Wi-Fi)
