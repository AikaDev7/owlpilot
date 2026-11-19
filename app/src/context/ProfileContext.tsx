import { createContext, ReactNode, useContext, useState } from "react";

// What the user told us in the onboarding steps. Later screens read it with useProfile().
export type Profile = {
  major: string | null;
  year: string | null; // Freshman / Sophomore / Junior / Senior
  startYear: number | null;
  gradYear: number | null;
  takenCourses: string[]; // course codes, e.g. "CS 1301"
};

const emptyProfile: Profile = { major: null, year: null, startYear: null, gradYear: null, takenCourses: [] };

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
