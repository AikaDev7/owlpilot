// Turns the accepted schedule into the class list shown on the Home screen.
import type { Schedule } from "./scheduler";
import type { Section } from "../data/sections";
import { Now, WEEKDAYS } from "./demoClock";

export type HomeClass = {
  course: string; // "CS 4306"
  title: string;
  day: string; // "Mon".."Fri"
  start: number; // minutes after midnight
  end: number;
  building: string; // code like "Q"
  buildingName: string; // "Engineering Technology Center"
  room: string;
  isLab: boolean;
};

const ONLINE_CAMPUSES = ["KSU Online", "eCore"];
const DISTANCE_MODES = ["Fully at a Distance", "Predominately at a Distance"];

function isOnlineSection(s: Section) {
  return ONLINE_CAMPUSES.includes(s.campus) || DISTANCE_MODES.includes(s.mode);
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Result: in-person classes (one per meeting day) and online courses with no set times
export function homeClasses(schedule: Schedule | null): { inPerson: HomeClass[]; online: { course: string; title: string }[] } {
  const inPerson: HomeClass[] = [];
  const online: { course: string; title: string }[] = [];
  if (!schedule) return { inPerson, online };
  for (const item of schedule.items) {
    let hasOnline = false;
    for (const section of [item.lecture, item.lab]) {
      if (!section) continue;
      if (isOnlineSection(section) || section.meetings.length === 0) {
        hasOnline = true;
        continue;
      }
      for (const m of section.meetings) {
        for (const day of m.days) {
          inPerson.push({
            course: item.code,
            title: item.title,
            day,
            start: toMinutes(m.start),
            end: toMinutes(m.end),
            building: m.building ?? "",
            buildingName: m.buildingName ?? m.building ?? "",
            room: m.room ?? "",
            isLab: section === item.lab,
          });
        }
      }
    }
    if (hasOnline && !inPerson.some((c) => c.course === item.code)) online.push({ course: item.code, title: item.title });
  }
  inPerson.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start - b.start);
  return { inPerson, online };
}

// Next in-person class after "now" this week (null if none is left)
export function nextClass(classes: HomeClass[], now: Now): HomeClass | null {
  const nowIndex = WEEKDAYS.indexOf(now.day);
  if (nowIndex === -1) return null; // weekend: nothing left this week
  return (
    classes.find((c) => {
      const i = WEEKDAYS.indexOf(c.day);
      return i > nowIndex || (i === nowIndex && c.start > now.minutes);
    }) ?? null
  );
}

export const FULL_DAY_NAMES: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
