import { createContext, ReactNode, useContext, useState } from "react";

export type BusyTime = { days: string[]; start: number; end: number }; // start/end = minutes after midnight

// Step 3 answers. Times of day are "Morning" | "Afternoon" | "Evening" | "Anytime".
export type Preferences = {
  numCourses: number;
  days: string[]; // "Mon".."Fri"
  times: string[];
  numOnline: number;
  notes: string;
  busyTimes: BusyTime[];
};

// What the AI understood from the free-text notes (see POST /api/parse-preferences).
// Times are "HH:MM" (24-hour). `error` is set when the AI was unavailable.
export type HardRule = { day: string; start: string; end: string };
export type SoftRule = { type: string; value: string; note: string };
export type AiRules = { hardRules: HardRule[]; softRules: SoftRule[]; summary: string[]; error?: string };

// What the user told us in the onboarding steps. Later screens read it with useProfile().
export type Profile = {
  major: string | null;
  year: string | null; // Freshman / Sophomore / Junior / Senior
  startYear: number | null;
  gradYear: number | null;
  takenCourses: string[]; // course codes, e.g. "CS 1301"
  semester: string | null; // e.g. "Spring 2027" (set on Select Courses)
  campus: string | null; // "Kennesaw" or "Marietta"
  selectedCourses: string[]; // course codes picked for next term
  preferences: Preferences | null; // set on the Preferences screen
  aiRules: AiRules | null; // set on the Building screen
};

const emptyProfile: Profile = { major: null, year: null, startYear: null, gradYear: null, takenCourses: [], semester: null, campus: null, selectedCourses: [], preferences: null, aiRules: null };

type ProfileContextValue = {
  profile: Profile;
  setProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside <ProfileProvider>");
  return value;
}
