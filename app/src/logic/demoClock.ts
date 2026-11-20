// The Home screen asks this file for "now". In demo mode the time is fixed
// (Tuesday 2:00 PM) so "Up Next" always shows a class during the demo.
export const DEMO_MODE = true;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export type Now = { day: string; minutes: number }; // day = "Mon".."Sun", minutes after midnight

const DEMO_NOW: Now = { day: "Tue", minutes: 14 * 60 };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getNow(): Now {
  if (DEMO_MODE) return DEMO_NOW;
  const d = new Date();
  return { day: DAY_NAMES[d.getDay()], minutes: d.getHours() * 60 + d.getMinutes() };
}
