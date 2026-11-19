// Builds schedules from the real section data. Plain code, no AI (the AI only gives us aiRules).
//
// Hard rules (never broken): no time overlaps (10 min travel time between two in-person classes),
// busy times, aiRules.hardRules, and the online count stays within numOnline.
// Soft rules (only change the score): professor rating, difficulty, preferred days/times,
// aiRules.softRules and fewer days on campus.
import { AiRules, Preferences, Profile } from "../context/ProfileContext";
import { Course, courses, findCourse } from "../data/courses";
import { formatTime } from "../data/schedule";
import { findProfessor, Section, sections } from "../data/sections";
import { getDegreePlan, hasOwnPlan } from "../mock/degreePlans";
import { recommend } from "./recommend";

// ---------- Public types ----------

export type SchedulerInput = Pick<Profile, "major" | "year" | "takenCourses" | "campus" | "selectedCourses"> & {
  preferences: Preferences;
  aiRules: AiRules | null;
};

// One meeting of one day, in minutes after midnight
export type Block = { code: string; day: string; start: number; end: number; inPerson: boolean };

// One course in a schedule: the lecture section, plus its lab section if the course has a lab
export type ScheduleItem = {
  code: string;
  title: string;
  professor: string; // "TBA" when unknown
  rating: number | null; // null = no ratings yet
  difficulty: number | null;
  lecture: Section;
  lab: Section | null;
  blocks: Block[];
  online: boolean; // fully online (hybrid counts as in person)
  waitlist: boolean; // the lecture or lab is full, so this is a waitlist pick
  waitCount: number; // students already on the waitlist
  suggested: boolean; // added by us to fill an open slot, not picked by the student
  suggestedReason?: string;
};

export type Schedule = {
  items: ScheduleItem[];
  score: number;
  avgRating: number; // missing rating counts as 3.0
  daysOnCampus: number;
};

export type SchedulerResult = {
  schedules: Schedule[]; // best first, up to 3
  worthConsidering: Schedule | null;
  notes: string[]; // e.g. a course that could not fit
};

// ---------- Settings ----------

const NEUTRAL_RATING = 3.0;
const TRAVEL_MINUTES = 10; // between two in-person classes
const LONG_GAP_MINUTES = 120;
const MAX_OPTIONS_PER_COURSE = 5; // best first
const WIDER_OPTIONS_PER_COURSE = 12; // used when the first try finds nothing
const MAX_WAITLIST_OPTIONS = 2;
const MAX_SUGGESTED_CANDIDATES = 6;
const MAX_LEAVES = 30000; // stop searching after this many complete schedules
const WORTH_CONSIDERING_GAP = 0.5;

// ---------- Small helpers ----------

const sectionsByCourse = new Map<string, Section[]>();
for (const s of sections) {
  const list = sectionsByCourse.get(s.course);
  if (list) list.push(s);
  else sectionsByCourse.set(s.course, [s]);
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const ONLINE_CAMPUSES = ["KSU Online", "eCore"];
const ONLINE_MODES = ["Fully at a Distance", "Predominately at a Distance"];
function isOnline(s: Section) {
  return ONLINE_CAMPUSES.includes(s.campus) || ONLINE_MODES.includes(s.mode);
}

function sectionBlocks(s: Section): Block[] {
  const inPerson = !isOnline(s);
  const blocks: Block[] = [];
  for (const m of s.meetings) {
    for (const day of m.days) blocks.push({ code: s.course, day, start: toMinutes(m.start), end: toMinutes(m.end), inPerson });
  }
  return blocks;
}

// 10 min travel time only matters when both classes are in person
function blocksConflict(a: Block[], b: Block[]) {
  for (const x of a) {
    for (const y of b) {
      if (x.day !== y.day) continue;
      const gap = x.inPerson && y.inPerson ? TRAVEL_MINUTES : 0;
      if (x.start < y.end + gap && y.start < x.end + gap) return true;
    }
  }
  return false;
}

type Busy = { day: string; start: number; end: number };

function hitsBusy(blocks: Block[], busy: Busy[]) {
  return blocks.some((b) => busy.some((x) => x.day === b.day && b.start < x.end && x.start < b.end));
}

function timeOfDay(start: number) {
  if (start < 12 * 60) return "Morning";
  if (start < 17 * 60) return "Afternoon";
  return "Evening";
}

// Days mentioned in a free-text value ("Friday", "Tue and Thu") -> ["Fri"], ["Tue", "Thu"]
function daysIn(value: string) {
  return (value.toLowerCase().match(/mon|tue|wed|thu|fri/g) ?? []).map((d) => d[0].toUpperCase() + d.slice(1));
}

function timesIn(value: string) {
  return (value.toLowerCase().match(/morning|afternoon|evening/g) ?? []).map((t) => t[0].toUpperCase() + t.slice(1));
}

function words(text: string) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 || w === "ai");
}

// Does the course match an "interest" rule such as "AI" or "psychology"?
function matchesInterest(course: Course, interests: string[]) {
  const courseWords = new Set(words(`${course.code} ${course.title}`));
  return interests.some((i) => words(i).some((w) => courseWords.has(w)));
}

// ---------- Scoring ----------

type Context = {
  prefs: Preferences;
  busy: Busy[];
  softRules: AiRules["softRules"];
  interests: string[];
  campus: string | null;
};

// Higher is better. `relaxed` ignores the preferred days and times chips (used for "Worth considering").
function scoreItems(items: ScheduleItem[], ctx: Context, relaxed: boolean): number {
  const { prefs, softRules } = ctx;
  const anyTime = prefs.times.length === 0 || prefs.times.includes("Anytime");
  let score = 0;

  for (const item of items) {
    score += 8; // more courses is better
    score += ((item.rating ?? NEUTRAL_RATING) - NEUTRAL_RATING) * 4;
    score += (NEUTRAL_RATING - (item.difficulty ?? NEUTRAL_RATING)) * 1.5;
    if (item.waitlist) score -= 15;
    if (item.suggested) score += item.suggestedReason?.startsWith("Required") ? 6 : 2;
    if (matchesInterest({ code: item.code, title: item.title, level: 0, prerequisites: [] }, ctx.interests)) score += 3;

    for (const b of item.blocks) {
      if (!relaxed) {
        if (prefs.days.length > 0 && !prefs.days.includes(b.day)) score -= 3;
        if (!anyTime && !prefs.times.includes(timeOfDay(b.start))) score -= 2;
      }
      for (const rule of softRules) {
        if (rule.type === "preferDay" && daysIn(rule.value).includes(b.day)) score += 3;
        if (rule.type === "avoidDay" && daysIn(rule.value).includes(b.day)) score -= 3;
        if (rule.type === "preferTime" && timesIn(rule.value).includes(timeOfDay(b.start))) score += 2;
        if (rule.type === "avoidTime" && timesIn(rule.value).includes(timeOfDay(b.start))) score -= 2;
      }
    }
  }

  // Things that depend on the whole schedule
  const byDay = new Map<string, Block[]>();
  const campusDays = new Set<string>();
  for (const item of items) {
    for (const b of item.blocks) {
      if (!byDay.has(b.day)) byDay.set(b.day, []);
      byDay.get(b.day)!.push(b);
      if (b.inPerson) campusDays.add(b.day);
    }
  }
  score -= campusDays.size * 2; // fewer days on campus

  const avoidGaps = softRules.some((r) => r.type === "avoidLongGaps");
  const maxPerDayRule = softRules.find((r) => r.type === "maxClassesPerDay");
  const maxPerDay = maxPerDayRule ? parseInt(maxPerDayRule.value, 10) : NaN;
  for (const blocks of byDay.values()) {
    blocks.sort((a, b) => a.start - b.start);
    if (avoidGaps) {
      for (let i = 1; i < blocks.length; i++) {
        if (blocks[i].start - blocks[i - 1].end > LONG_GAP_MINUTES) score -= 3;
      }
    }
    if (!isNaN(maxPerDay)) {
      const classes = new Set(blocks.map((b) => b.code)).size;
      if (classes > maxPerDay) score -= 5 * (classes - maxPerDay);
    }
  }
  return score;
}

function averageRating(items: ScheduleItem[]) {
  if (items.length === 0) return NEUTRAL_RATING;
  return items.reduce((sum, i) => sum + (i.rating ?? NEUTRAL_RATING), 0) / items.length;
}

function daysOnCampusOf(items: ScheduleItem[]) {
  const days = new Set<string>();
  for (const item of items) for (const b of item.blocks) if (b.inPerson) days.add(b.day);
  return days.size;
}

// ---------- Options for one course ----------

function campusAllowed(s: Section, campus: string | null) {
  if (isOnline(s) || !campus) return true;
  return s.campus === `${campus} Campus`;
}

function seatsOpen(s: Section) {
  return !s.isFull && s.seatsAvailable > 0;
}

function waitlistPossible(s: Section) {
  return s.waitCount < s.waitCapacity;
}

function makeItem(course: Pick<Course, "code" | "title">, lecture: Section, lab: Section | null, suggestedReason?: string): ScheduleItem {
  const prof = findProfessor(lecture.professor);
  const parts = lab ? [lecture, lab] : [lecture];
  const full = parts.filter((p) => !seatsOpen(p));
  return {
    code: course.code,
    title: course.title,
    professor: lecture.professor,
    rating: prof?.rating ?? null,
    difficulty: prof?.difficulty ?? null,
    lecture,
    lab,
    blocks: [...sectionBlocks(lecture), ...(lab ? sectionBlocks(lab) : [])],
    online: isOnline(lecture),
    waitlist: full.length > 0,
    waitCount: full.length > 0 ? Math.max(...full.map((p) => p.waitCount)) : 0,
    suggested: suggestedReason !== undefined,
    suggestedReason,
  };
}

// Two sections with the same professor, times and place are the same choice for the student
function itemKey(item: ScheduleItem) {
  const part = (s: Section | null) =>
    s ? `${s.professor}|${s.campus}|${s.mode}|${s.meetings.map((m) => `${m.days}${m.start}${m.end}${m.building}${m.room}`).join(";")}` : "";
  return `${part(item.lecture)}##${part(item.lab)}`;
}

type Options = { open: ScheduleItem[]; waitlist: ScheduleItem[] };

function buildOptions(course: Pick<Course, "code" | "title">, ctx: Context, cap: number, suggestedReason?: string): Options {
  const busy = ctx.busy;
  const usable = (s: Section) => campusAllowed(s, ctx.campus) && !hitsBusy(sectionBlocks(s), busy);

  const lectures = (sectionsByCourse.get(course.code) ?? []).filter(usable);
  const hasLab = sectionsByCourse.has(`${course.code}L`);
  const labs: (Section | null)[] = hasLab ? (sectionsByCourse.get(`${course.code}L`) ?? []).filter(usable) : [null];

  // Every lecture paired with every lab that does not overlap it (open seats first, so they win the dedupe)
  const all: ScheduleItem[] = [];
  for (const lecture of lectures) {
    for (const lab of labs) {
      if (lab && blocksConflict(sectionBlocks(lecture), sectionBlocks(lab))) continue;
      const item = makeItem(course, lecture, lab, suggestedReason);
      if (item.online && ctx.prefs.numOnline <= 0) continue;
      all.push(item);
    }
  }
  all.sort((a, b) => Number(a.waitlist) - Number(b.waitlist));
  const seen = new Set<string>();
  const unique = all.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const solo = (item: ScheduleItem, relaxed: boolean) => scoreItems([item], ctx, relaxed);
  const open = unique.filter((i) => !i.waitlist);
  const waitlist = unique
    .filter((i) => i.waitlist && [i.lecture, i.lab].every((p) => !p || seatsOpen(p) || waitlistPossible(p)))
    .sort((a, b) => solo(b, false) - solo(a, false))
    .slice(0, suggestedReason ? 0 : MAX_WAITLIST_OPTIONS); // suggested courses never go on a waitlist

  // Best options for the student's preferences, plus a few with the best professors
  // (so "Worth considering" can use them even at times the student did not prefer)
  const byStrict = [...open].sort((a, b) => solo(b, false) - solo(a, false));
  const byRelaxed = [...open].sort((a, b) => solo(b, true) - solo(a, true));
  const picked = new Set<ScheduleItem>([...byStrict.slice(0, cap), ...byRelaxed.slice(0, 3)]);
  return { open: [...picked], waitlist };
}

// ---------- Search ----------

type Entry = { code: string; suggested: boolean; open: ScheduleItem[]; waitlist: ScheduleItem[] };
type Found = { items: ScheduleItem[]; score: number; relaxedScore: number; avgRating: number };

function search(entries: Entry[], requiredTarget: number, maxSuggested: number, ctx: Context): Found[] {
  const requiredCount = entries.filter((e) => !e.suggested).length;
  const remainingRequired: number[] = new Array(entries.length + 1).fill(0);
  for (let i = entries.length - 1; i >= 0; i--) remainingRequired[i] = remainingRequired[i + 1] + (entries[i].suggested ? 0 : 1);

  const found: Found[] = [];
  const chosen: ScheduleItem[] = [];
  let onlineCount = 0;
  let requiredPicked = 0;
  let suggestedPicked = 0;
  let skipsLeft = requiredCount - requiredTarget;

  function fits(item: ScheduleItem) {
    if (item.online && onlineCount >= ctx.prefs.numOnline) return false;
    return !chosen.some((c) => blocksConflict(c.blocks, item.blocks));
  }

  function dfs(i: number) {
    if (found.length >= MAX_LEAVES) return;
    if (requiredPicked + remainingRequired[i] < requiredTarget) return;
    if (i === entries.length) {
      if (requiredPicked === requiredTarget) {
        const items = [...chosen];
        found.push({
          items,
          score: scoreItems(items, ctx, false),
          relaxedScore: scoreItems(items, ctx, true),
          avgRating: averageRating(items),
        });
      }
      return;
    }
    const e = entries[i];
    if (!e.suggested || suggestedPicked < maxSuggested) {
      // A waitlist section is only used when no open section fits
      let options = e.open.filter(fits);
      if (options.length === 0) options = e.waitlist.filter(fits);
      for (const item of options) {
        chosen.push(item);
        if (item.online) onlineCount++;
        if (e.suggested) suggestedPicked++;
        else requiredPicked++;
        dfs(i + 1);
        if (item.online) onlineCount--;
        if (e.suggested) suggestedPicked--;
        else requiredPicked--;
        chosen.pop();
      }
    }
    if (e.suggested) {
      dfs(i + 1);
    } else if (skipsLeft > 0) {
      skipsLeft--;
      dfs(i + 1);
      skipsLeft++;
    }
  }

  dfs(0);
  return found;
}

// Best schedules first, but try to make each one differ from the others in at least 2 courses
function pickTop(sorted: Found[], count: number): Found[] {
  const sameSection = (a: ScheduleItem, b: ScheduleItem) => a.lecture.crn === b.lecture.crn && a.lab?.crn === b.lab?.crn;
  const differences = (a: Found, b: Found) => a.items.filter((i) => !b.items.some((j) => sameSection(i, j))).length;
  const top: Found[] = [];
  for (const minDifferent of [2, 1]) {
    for (const f of sorted) {
      if (top.length < count && !top.includes(f) && top.every((t) => differences(f, t) >= minDifferent)) top.push(f);
    }
  }
  return top.sort((a, b) => b.score - a.score);
}

function signature(items: ScheduleItem[]) {
  return items.map((i) => `${i.lecture.crn}/${i.lab?.crn ?? ""}`).sort().join(",");
}

function toSchedule(f: Found): Schedule {
  const items = [...f.items].sort((a, b) => a.code.localeCompare(b.code));
  return { items, score: Math.round(f.score * 10) / 10, avgRating: Math.round(f.avgRating * 100) / 100, daysOnCampus: daysOnCampusOf(items) };
}

// ---------- Main function ----------

export function buildSchedules(input: SchedulerInput): SchedulerResult {
  const { preferences: prefs, aiRules } = input;
  const notes: string[] = [];

  // Hard time blocks: busy times from the student and hard rules from the AI
  const busy: Busy[] = [];
  for (const b of prefs.busyTimes) for (const day of b.days) busy.push({ day, start: b.start, end: b.end });
  for (const r of aiRules?.hardRules ?? []) busy.push({ day: r.day, start: toMinutes(r.start), end: toMinutes(r.end) });

  const softRules = aiRules?.softRules ?? [];
  const ctx: Context = {
    prefs,
    busy,
    softRules,
    interests: softRules.filter((r) => r.type === "interest").map((r) => r.value),
    campus: input.campus,
  };

  // Selected courses (labs are added automatically, so a lab code on its own is ignored)
  const selected = input.selectedCourses
    .filter((code, i, all) => all.indexOf(code) === i)
    .map((code) => ({ code, title: findCourse(code)?.title ?? sectionsByCourse.get(code)?.[0]?.title ?? code }))
    .filter((c) => sectionsByCourse.has(c.code) && findCourse(c.code));
  const total = prefs.numCourses > 0 ? prefs.numCourses : selected.length;

  for (const course of selected) {
    const entry = buildOptions(course, ctx, MAX_OPTIONS_PER_COURSE);
    if (entry.open.length + entry.waitlist.length === 0) {
      notes.push(`${course.code} has no section on ${input.campus ?? "your"} campus or online that fits your busy times.`);
    }
  }

  // Try a small set of options per course first, then a wider one if nothing fits
  for (const cap of [MAX_OPTIONS_PER_COURSE, WIDER_OPTIONS_PER_COURSE]) {
    const required: Entry[] = selected
      .map((c) => ({ code: c.code, suggested: false, ...buildOptions(c, ctx, cap) }))
      .filter((e) => e.open.length + e.waitlist.length > 0)
      .sort((a, b) => a.open.length + a.waitlist.length - (b.open.length + b.waitlist.length));

    // Open slots beyond the selected courses: degree-plan courses first, then electives matching "interest" rules
    const extraSlots = Math.max(0, total - selected.length);
    const suggested: Entry[] = extraSlots > 0 ? suggestedEntries(input, ctx) : [];
    const entries = [...required, ...suggested];

    // If the selected courses cannot all fit, try with one course fewer, and so on
    const start = Math.min(total, required.length);
    for (let target = start; target >= 1; target--) {
      const found = search(entries, target, extraSlots, ctx);
      if (found.length === 0) continue;

      found.sort((a, b) => b.score - a.score);
      const top = pickTop(found, 3);
      const topSignatures = new Set(top.map((f) => signature(f.items)));
      const best = top[0];

      // "Worth considering": best schedule when preferred days/times are ignored, if its professors are clearly better
      const better = found
        .filter((f) => f.avgRating >= best.avgRating + WORTH_CONSIDERING_GAP && !topSignatures.has(signature(f.items)))
        .sort((a, b) => b.relaxedScore - a.relaxedScore)[0];

      const placed = new Set(best.items.map((i) => i.code));
      for (const c of selected) {
        if (!placed.has(c.code) && !notes.some((n) => n.startsWith(c.code))) {
          notes.push(`${c.code} did not fit with your other courses and rules, so it was left out.`);
        }
      }
      return { schedules: top.map(toSchedule), worthConsidering: better ? toSchedule(better) : null, notes };
    }
  }

  notes.push("No schedule fits all your rules. Try fewer busy times or more campuses/days.");
  return { schedules: [], worthConsidering: null, notes };
}

function suggestedEntries(input: SchedulerInput, ctx: Context): Entry[] {
  const selected = input.selectedCourses;
  const entries: Entry[] = [];
  const used = new Set<string>(selected);

  const add = (course: Course, reason: string) => {
    if (entries.length >= MAX_SUGGESTED_CANDIDATES || used.has(course.code)) return;
    const options = buildOptions(course, ctx, 3, reason);
    if (options.open.length === 0) return;
    used.add(course.code);
    entries.push({ code: course.code, suggested: true, ...options });
  };

  // 1. Degree-plan courses the student can take now
  for (const r of recommend(input, selected, 20)) add(r.course, hasOwnPlan(input.major) ? `Required for ${input.major}` : "Required core course");

  // 2. Electives that match what the student said they like
  if (ctx.interests.length > 0) {
    const plan = getDegreePlan(input.major);
    for (const c of courses) {
      if (!c.isElective || plan.includes(c.code) || input.takenCourses.includes(c.code)) continue;
      if (!c.prerequisites.every((p) => input.takenCourses.includes(p))) continue;
      if (matchesInterest(c, ctx.interests)) add(c, "Elective that matches your interests");
    }
  }
  return entries;
}

// ---------- Display helpers (for the Results screen) ----------

function sectionLines(s: Section, prefix: string) {
  if (s.meetings.length === 0) return [`${prefix}Online, no set meeting times`];
  return s.meetings.map(
    (m) => `${prefix}${m.days.join(", ")} ${formatTime(toMinutes(m.start))}–${formatTime(toMinutes(m.end))} · ${m.building} ${m.room}`,
  );
}

// ["Mon, Wed, Fri 11:30 AM–12:25 PM · Q 311", "Lab: Tue 2:00 PM–3:50 PM · Q 211"]
export function meetingLines(item: ScheduleItem): string[] {
  return [...sectionLines(item.lecture, ""), ...(item.lab ? sectionLines(item.lab, "Lab: ") : [])];
}
