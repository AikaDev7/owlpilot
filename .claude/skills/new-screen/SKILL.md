---
name: new-screen
description: Add a new OwlPilot screen from a Figma frame, following the project's conventions. Use when asked to build or add a screen.
---

Build the screen named in the request (ask for a node-specific Figma URL if none was given).

1. Read the Figma frame first (file key `22ozX0doqUgl5Svih1DqjR`): `get_screenshot`, then `get_design_context` with `excludeScreenshot` to save tokens. Adapt the output, never paste the Tailwind/web code.
2. Add the route and its params to `RootStackParamList` in `app/src/navigation.ts`.
3. Register a `Stack.Screen` in `app/App.tsx`. Use `navigation.replace` if Back shouldn't return to it.
4. Create `app/src/screens/<Name>Screen.tsx`, props typed `NativeStackScreenProps<RootStackParamList, "<Name>">`.
5. Style with `StyleSheet` using `src/theme.ts` only: no hex values in screens (add missing colors to the theme), Outfit for titles, Manrope for the rest, never Poppins.
6. Reuse `src/components/` (`PrimaryButton`, `Chip`, `Dropdown`, `SearchSelect`, `StepHeader`, `SectionTitle`...) before making new ones.
7. Wrap form screens in `ScreenContainer` so the keyboard never covers inputs.
8. Shared data lives in `ProfileContext` (`useProfile()`); save with `setProfile({ ...profile, ... })`.
9. Only Expo Go-compatible packages, installed with `npx expo install`. Never call Gemini or any API from the app: add a server endpoint and an `api.ts` wrapper.
10. Run `cd app && npx tsc --noEmit`, then add a short paragraph about the screen to CLAUDE.md.
