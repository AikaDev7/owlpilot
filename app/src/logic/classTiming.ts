// "Starts in 15 min" text for a class on the Find Class screen (uses the demo clock).
import type { Schedule } from "./scheduler";
import { formatTime } from "../data/schedule";
import { getNow, WEEKDAYS } from "./demoClock";
import { FULL_DAY_NAMES, homeClasses } from "./homeClasses";

export function startsText(schedule: Schedule | null, course: string): string | null {
  const meetings = homeClasses(schedule).inPerson.filter((c) => c.course === course);
  if (meetings.length === 0) return null;
  const now = getNow();
  const today = WEEKDAYS.indexOf(now.day);
  // days from now until the meeting (0 = today); a class that already ended today counts as next week
  const daysAway = (day: string, end: number) => {
    const d = (WEEKDAYS.indexOf(day) - today + 7) % 7;
    return d === 0 && end <= now.minutes ? 7 : d;
  };
  const next = [...meetings].sort((a, b) => daysAway(a.day, a.end) * 1440 + a.start - (daysAway(b.day, b.end) * 1440 + b.start))[0];
  const away = daysAway(next.day, next.end);
  if (away === 0) {
    if (next.start <= now.minutes) return "Class is in session";
    const mins = next.start - now.minutes;
    return mins < 60 ? `Starts in ${mins} min` : `Starts in ${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
  }
  return `Starts ${FULL_DAY_NAMES[next.day]} at ${formatTime(next.start)}`;
}
