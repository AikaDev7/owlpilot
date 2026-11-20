// Display helpers for the My Schedule and Find tabs (plain formatting, no scheduler changes).
import type { ScheduleItem } from "./scheduler";
import type { Section } from "../data/sections";
import { buildingLabel } from "../data/sections";
import { formatTime } from "../data/schedule";

const ONLINE_CAMPUSES = ["KSU Online", "eCore"];
const DISTANCE_MODES = ["Fully at a Distance", "Predominately at a Distance"];

export function isOnlineSection(s: Section) {
  return ONLINE_CAMPUSES.includes(s.campus) || DISTANCE_MODES.includes(s.mode);
}

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// "Mon, Wed · 10:00 AM - 11:15 AM" for each meeting of a section
export function timeLines(s: Section): string[] {
  return s.meetings.map((m) => `${m.days.join(", ")} · ${formatTime(minutes(m.start))} - ${formatTime(minutes(m.end))}`);
}

export type Place = { building: string; buildingName: string; room: string };

// First in-person place of the item (lecture first, then lab), or null for online classes
export function placeOf(item: ScheduleItem): Place | null {
  for (const s of [item.lecture, item.lab]) {
    if (!s || isOnlineSection(s)) continue;
    const m = s.meetings.find((x) => x.building);
    if (m) return { building: m.building, buildingName: m.buildingName || m.building, room: m.room };
  }
  return null;
}

// "In Person", "Hybrid", "Online (Synchronous)" or "Online (Asynchronous)"
export function formatLabel(s: Section) {
  if (isOnlineSection(s)) return s.meetings.length === 0 ? "Online (Asynchronous)" : "Online (Synchronous)";
  if (/hybrid/i.test(s.mode)) return "Hybrid";
  return "In Person";
}

// "In Person · Q · Room 204" or "Online (Asynchronous)"
export function formatLine(item: ScheduleItem) {
  const label = formatLabel(item.lecture);
  const p = placeOf(item);
  return p ? `${label} · ${buildingLabel(p.building, p.buildingName)} · Room ${p.room}` : label;
}

export type FindEntry = { course: string; title: string; days: string[]; start: number; end: number; building: string; buildingName: string; room: string };

// In-person classes for the Find tab: one entry per course meeting time (Mon/Wed collapse into one)
export function findEntries(items: ScheduleItem[]): FindEntry[] {
  const out: FindEntry[] = [];
  for (const item of items) {
    for (const s of [item.lecture, item.lab]) {
      if (!s || isOnlineSection(s)) continue;
      for (const m of s.meetings) {
        if (!m.building) continue;
        out.push({ course: item.code, title: item.title, days: m.days, start: minutes(m.start), end: minutes(m.end), building: m.building, buildingName: m.buildingName || m.building, room: m.room });
      }
    }
  }
  return out;
}
