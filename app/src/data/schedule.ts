// Shared constants and helpers for the schedule preferences.
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const TIMES_OF_DAY = [
  { key: "Morning", label: "Morning", range: "8 AM - 12 PM" },
  { key: "Afternoon", label: "Afternoon", range: "12 PM - 5 PM" },
  { key: "Evening", label: "Evening", range: "After 5 PM" },
  { key: "Anytime", label: "Anytime", range: "I’m flexible" },
];

// Times are stored as minutes after midnight (2:00 PM = 840)
export function formatTime(minutes: number, withSuffix = true): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = h24 < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")}${withSuffix ? " " + suffix : ""}`;
}

// 7:00 AM to 10:00 PM in 30-minute steps
export const TIME_STEPS: number[] = [];
for (let t = 7 * 60; t <= 22 * 60; t += 30) TIME_STEPS.push(t);

// "Tue, Thu · 2:00–6:00 PM"  (the AM/PM is shown once if both times share it)
export function busyTimeLabel(days: string[], start: number, end: number): string {
  const samePeriod = start < 720 === end < 720;
  const range = samePeriod
    ? `${formatTime(start, false)}–${formatTime(end)}`
    : `${formatTime(start)}–${formatTime(end)}`;
  return `${days.join(", ")} · ${range}`;
}
