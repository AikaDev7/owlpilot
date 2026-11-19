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
  level: number; // 1000-4000, 0 if unknown
  tags: ItemTag[];
  alternative: Alternative | null; // one better section of this course that we skipped, with the reason
};

// "noRatings": the professor has no ratings. "outsidePreferredTime": a class is outside the chosen time chips.
export type ItemTag = "noRatings" | "outsidePreferredTime";

export type Alternative = {
  item: ScheduleItem; // same course, a different section (and its lab); alternative is always null here
  reason: string; // "full, waitlist 3/20", "outside your preferred time" or "online"
};

// Which tab a schedule belongs to: balanced overall, best professors, or fewest days on campus
export type Strategy = "best" | "professors" | "fewestDays";

export type Schedule = {
  strategy: Strategy | null; // null for "Find another" schedules
  highlight: string; // one line made from the data, e.g. "only 2 days on campus"
  badges: string[]; // e.g. "⭐ Also the highest-rated option" when a hidden tab had the same schedule
  onlineNote: string | null; // who uses the online slots, e.g. "Your 1 online slot is used by CSE 2300 (Zhang, 4.7★)"
  items: ScheduleItem[];
  score: number;
  avgRating: number; // missing rating counts as 2.5
  daysOnCampus: number;
};

export type SchedulerResult = {
  schedules: Schedule[]; // one per strategy, in the order best, professors, fewestDays (up to 3)
  notes: string[]; // e.g. a course that could not fit
};

// ---------- Settings ----------

const NEUTRAL_RATING = 3.0; // the "average" rating the score is measured against
const NO_RATING_SCORE = 2.5; // a professor without ratings counts as below average
const MIN_ALTERNATIVE_GAIN = 0.8; // an alternative section needs a professor rated this much higher
const TRAVEL_MINUTES = 10; // between two in-person classes
const LONG_GAP_MINUTES = 120;
const MAX_OPTIONS_PER_COURSE = 5; // best first
const WIDER_OPTIONS_PER_COURSE = 12; // used when the first try finds nothing
const MAX_WAITLIST_OPTIONS = 2;
const MAX_SUGGESTED_CANDIDATES = 6;
const MAX_LEAVES = 30000; // stop searching after this many complete schedules
const ONLINE_PRIORITY_GAIN = 0.5; // a selected course keeps first claim on an online slot if it gains at least this much
const MIN_DIFFERENT = 2; // schedules shown together differ in at least this many courses or professors

// Course levels that fit each year when we fill open slots
const FIT_LEVELS: Record<string, number[]> = { Freshman: [1000], Sophomore: [2000], Junior: [3000, 4000], Senior: [4000] };
const WRONG_LEVEL_PENALTY = 4;
// Interest electives may also be one level below (a junior can take a 2000-level elective)
const INTEREST_LEVELS: Record<string, number[]> = { ...FIT_LEVELS, Junior: [2000, 3000, 4000] };

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
function ordinal(n: number) {
  return ORDINALS[n] ?? `${n}th`;
}

function normCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, " ");
}

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
  year: string | null;
};

// Higher is better. `relaxed` ignores the preferred days and times chips (used for "Worth considering").
function scoreItems(items: ScheduleItem[], ctx: Context, relaxed: boolean): number {
  const { prefs, softRules } = ctx;
  const anyTime = prefs.times.length === 0 || prefs.times.includes("Anytime");
  let score = 0;

  for (const item of items) {
    score += 8; // more courses is better
    score += ((item.rating ?? NO_RATING_SCORE) - NEUTRAL_RATING) * 4;
    score += (NEUTRAL_RATING - (item.difficulty ?? NEUTRAL_RATING)) * 1.5;
    if (item.waitlist) score -= 15;
    if (item.suggested) {
      const isInterestElective = item.suggestedReason?.startsWith("Elective");
      score += isInterestElective ? 10 : 6; // interest electives rank above core courses
      if (!isInterestElective && item.level > 0 && !(FIT_LEVELS[ctx.year ?? ""] ?? []).includes(item.level)) score -= WRONG_LEVEL_PENALTY;
    }
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
  if (items.length === 0) return NO_RATING_SCORE;
  return items.reduce((sum, i) => sum + (i.rating ?? NO_RATING_SCORE), 0) / items.length;
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

function makeItem(course: Pick<Course, "code" | "title"> & { level?: number }, lecture: Section, lab: Section | null, ctx: Context, suggestedReason?: string): ScheduleItem {
  const prof = findProfessor(lecture.professor);
  const parts = lab ? [lecture, lab] : [lecture];
  const full = parts.filter((p) => !seatsOpen(p));
  const blocks = [...sectionBlocks(lecture), ...(lab ? sectionBlocks(lab) : [])];
  const anyTime = ctx.prefs.times.length === 0 || ctx.prefs.times.includes("Anytime");
  const tags: ItemTag[] = [];
  if (!prof || prof.rating === null) tags.push("noRatings");
  if (!anyTime && blocks.some((b) => !ctx.prefs.times.includes(timeOfDay(b.start)))) tags.push("outsidePreferredTime");
  return {
    code: course.code,
    title: course.title,
    professor: lecture.professor,
    rating: prof?.rating ?? null,
    difficulty: prof?.difficulty ?? null,
    lecture,
    lab,
    blocks,
    online: isOnline(lecture),
    waitlist: full.length > 0,
    waitCount: full.length > 0 ? Math.max(...full.map((p) => p.waitCount)) : 0,
    suggested: suggestedReason !== undefined,
    suggestedReason,
    level: course.level ?? findCourse(course.code)?.level ?? 0,
    tags,
    alternative: null,
  };
}

// Two sections with the same professor, times and place are the same choice for the student
function itemKey(item: ScheduleItem) {
  const part = (s: Section | null) =>
    s ? `${s.professor}|${s.campus}|${s.mode}|${s.meetings.map((m) => `${m.days}${m.start}${m.end}${m.building}${m.room}`).join(";")}` : "";
  return `${part(item.lecture)}##${part(item.lab)}`;
}

type Options = { open: ScheduleItem[]; waitlist: ScheduleItem[] };

// Every usable lecture+lab combination of a course (deduped, open seats first).
// Sections that hit a busy time or are on another campus are never included.
function allItems(course: Pick<Course, "code" | "title">, ctx: Context, suggestedReason?: string, allowOnline = false): ScheduleItem[] {
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
      const item = makeItem(course, lecture, lab, ctx, suggestedReason);
      if (item.online && ctx.prefs.numOnline <= 0 && !allowOnline) continue;
      all.push(item);
    }
  }
  all.sort((a, b) => Number(a.waitlist) - Number(b.waitlist));
  const seen = new Set<string>();
  return all.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Every class of the item is on a preferred day and in a preferred time (online classes with no meetings always fit)
function fitsPreferences(item: ScheduleItem, ctx: Context) {
  const anyTime = ctx.prefs.times.length === 0 || ctx.prefs.times.includes("Anytime");
  return item.blocks.every((b) => (ctx.prefs.days.length === 0 || ctx.prefs.days.includes(b.day)) && (anyTime || ctx.prefs.times.includes(timeOfDay(b.start))));
}

function buildOptions(course: Pick<Course, "code" | "title">, ctx: Context, cap: number, suggestedReason?: string): Options {
  // A suggested (filler) course must fit the preferred days and times, so it never adds a day like Friday
  const unique = allItems(course, ctx, suggestedReason).filter((i) => !suggestedReason || fitsPreferences(i, ctx));
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
type Found = { items: ScheduleItem[]; score: number; avgRating: number };

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

  // Selected courses get first claim on online slots: a suggested (filler) course may be online only if no
  // selected in-person course could take an online section with a professor rated 0.5+ higher instead.
  function fillerTakesBetterOnlineSlot(items: ScheduleItem[]) {
    if (!items.some((i) => i.suggested && i.online)) return false;
    for (const e of entries) {
      if (e.suggested) continue;
      const current = items.find((i) => i.code === e.code);
      if (!current || current.online) continue;
      const needed = (current.rating ?? NO_RATING_SCORE) + ONLINE_PRIORITY_GAIN;
      const others = items.filter((i) => i !== current && !(i.suggested && i.online)); // the filler would give the slot up
      if (e.open.some((o) => o.online && o.rating !== null && o.rating >= needed && !others.some((x) => blocksConflict(x.blocks, o.blocks)))) return true;
    }
    return false;
  }

  function dfs(i: number) {
    if (found.length >= MAX_LEAVES) return;
    if (requiredPicked + remainingRequired[i] < requiredTarget) return;
    if (i === entries.length) {
      if (requiredPicked === requiredTarget) {
        const items = [...chosen];
        if (fillerTakesBetterOnlineSlot(items)) return;
        found.push({
          items,
          score: scoreItems(items, ctx, false),
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

// How many items of `a` have no item of `b` with the same course AND professor (the larger of both directions)
function differences(a: ScheduleItem[], b: ScheduleItem[]) {
  const count = (x: ScheduleItem[], y: ScheduleItem[]) => x.filter((i) => !y.some((j) => j.code === i.code && j.professor === i.professor)).length;
  return Math.max(count(a, b), count(b, a));
}

function signature(items: ScheduleItem[]) {
  return items.map((i) => `${i.lecture.crn}/${i.lab?.crn ?? ""}`).sort().join(",");
}

// For each course: one better section we skipped (professor rated >= 0.8 higher) that is full, outside the
// preferred times or online when the student wants 0 online. It never breaks busy times, AI hard rules,
// or time conflicts with the rest of the schedule.
function findAlternative(item: ScheduleItem, others: ScheduleItem[], ctx: Context): Alternative | null {
  const course = { code: item.code, title: item.title };
  const currentRating = item.rating ?? NO_RATING_SCORE;
  let best: Alternative | null = null;
  for (const cand of allItems(course, ctx, item.suggestedReason, true)) {
    if (cand.lecture.crn === item.lecture.crn && cand.lab?.crn === item.lab?.crn) continue;
    if (cand.rating === null || cand.rating < currentRating + MIN_ALTERNATIVE_GAIN) continue;
    if (others.some((o) => blocksConflict(o.blocks, cand.blocks))) continue;

    let reason: string | null = null;
    if (cand.waitlist) {
      const full = [cand.lecture, cand.lab].filter((p): p is Section => !!p && !seatsOpen(p));
      if (!full.every(waitlistPossible)) continue; // the waitlist itself is full
      const worst = full.reduce((a, b) => (b.waitCount > a.waitCount ? b : a));
      reason = `full, waitlist ${worst.waitCount}/${worst.waitCapacity}`;
    } else if (cand.online && ctx.prefs.numOnline <= 0) {
      reason = "online";
    } else if (cand.tags.includes("outsidePreferredTime")) {
      reason = "outside your preferred time";
    }
    if (!reason) continue; // nothing kept it out, so it is not an "alternative" to mention
    if (!best || (cand.rating ?? 0) > (best.item.rating ?? 0)) best = { item: cand, reason };
  }
  return best;
}

const STRATEGIES: Strategy[] = ["best", "professors", "fewestDays"];

// One line under the tab, made from the data (no AI)
function highlightFor(items: ScheduleItem[], avgRating: number, daysOnCampus: number, strategy: Strategy | null, ctx: Context): string {
  const avg = `${avgRating.toFixed(1)}★`;
  if (strategy === "professors") {
    const great = items.filter((i) => (i.rating ?? 0) > 4).length;
    return great > 0 ? `${great} class${great > 1 ? "es" : ""} rated above 4★, avg ${avg}` : `best-rated professors available, avg ${avg}`;
  }
  if (strategy === "fewestDays") {
    if (daysOnCampus === 0) return "no days on campus";
    return `only ${daysOnCampus} day${daysOnCampus > 1 ? "s" : ""} on campus`;
  }
  const outside = items.filter(
    (i) => i.tags.includes("outsidePreferredTime") || (ctx.prefs.days.length > 0 && i.blocks.some((b) => !ctx.prefs.days.includes(b.day))),
  ).length;
  const fit = outside === 0 ? "all classes fit your preferred days and times" : `${outside} class${outside > 1 ? "es" : ""} outside your preferred days or times`;
  return `${fit}, avg ${avg}`;
}

// "Your 1 online slot is used by CSE 2300 (Zhang, 4.7★)" (null when no class is online)
function onlineNoteFor(items: ScheduleItem[], ctx: Context): string | null {
  const online = items.filter((i) => i.online);
  if (online.length === 0) return null;
  const who = online
    .map((i) => `${i.code} (${i.professor.split(" ").pop()}, ${i.rating === null ? "no ratings" : `${i.rating.toFixed(1)}★`}${i.suggested ? ", suggested" : ""})`)
    .join(", ");
  const k = online.length;
  return k >= ctx.prefs.numOnline
    ? `Your ${k} online slot${k > 1 ? "s are" : " is"} used by ${who}`
    : `${k} of your ${ctx.prefs.numOnline} online slots used by ${who}`;
}

function toSchedule(f: Found, ctx: Context, strategy: Strategy | null): Schedule {
  const items = [...f.items]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => ({ ...item, alternative: findAlternative(item, f.items.filter((o) => o !== item), ctx) }));
  const avgRating = Math.round(f.avgRating * 100) / 100;
  const daysOnCampus = daysOnCampusOf(items);
  return { strategy, highlight: highlightFor(items, avgRating, daysOnCampus, strategy, ctx), badges: [], onlineNote: onlineNoteFor(items, ctx), items, score: Math.round(f.score * 10) / 10, avgRating, daysOnCampus };
}

// Best schedule first for each strategy. Ties on the main number are broken by the balanced score.
// Only schedules with the most courses compete, so "Best Professors" can't win by dropping a course.
function rank(found: Found[], strategy: Strategy): Found[] {
  const most = Math.max(...found.map((f) => f.items.length));
  const withDays = found.filter((f) => f.items.length === most).map((f) => ({ f, days: daysOnCampusOf(f.items) }));
  withDays.sort((a, b) => {
    if (strategy === "professors" && a.f.avgRating !== b.f.avgRating) return b.f.avgRating - a.f.avgRating;
    if (strategy === "fewestDays" && a.days !== b.days) return a.days - b.days;
    return b.f.score - a.f.score;
  });
  return withDays.map((x) => x.f);
}

// ---------- Main function ----------

// Busy times + AI hard rules + soft rules for one request
function makeContext(input: SchedulerInput): Context {
  const { preferences: prefs, aiRules } = input;

  // Hard time blocks: busy times from the student and hard rules from the AI
  const busy: Busy[] = [];
  for (const b of prefs.busyTimes) for (const day of b.days) busy.push({ day, start: b.start, end: b.end });
  for (const r of aiRules?.hardRules ?? []) busy.push({ day: r.day, start: toMinutes(r.start), end: toMinutes(r.end) });

  const softRules = aiRules?.softRules ?? [];
  return {
    prefs,
    busy,
    softRules,
    interests: softRules.filter((r) => r.type === "interest").map((r) => r.value),
    campus: input.campus,
    year: input.year,
  };
}

// "Choose This Option": put `newItem` in place of the course at `index`. Rechecks time conflicts, busy times,
// AI hard rules and the online limit. Returns the new schedule, or a short error message.
export function swapItem(input: SchedulerInput, schedule: Schedule, index: number, newItem: ScheduleItem): { schedule: Schedule } | { error: string; onlineLimit?: boolean } {
  const ctx = makeContext(input);
  const others = schedule.items.filter((_, i) => i !== index);
  if (hitsBusy(newItem.blocks, ctx.busy)) return { error: "That section overlaps a time you can’t take classes." };
  if (others.some((o) => blocksConflict(o.blocks, newItem.blocks))) return { error: "That section conflicts with another class in this schedule." };
  if (others.filter((o) => o.online).length + (newItem.online ? 1 : 0) > ctx.prefs.numOnline) {
    return { error: "That would be more online classes than you chose.", onlineLimit: true };
  }
  const items = schedule.items.map((item, i) => (i === index ? { ...newItem, alternative: null } : item));
  const avgRating = Math.round(averageRating(items) * 100) / 100;
  const daysOnCampus = daysOnCampusOf(items);
  return { schedule: { ...schedule, items, avgRating, daysOnCampus, highlight: highlightFor(items, avgRating, daysOnCampus, schedule.strategy, ctx), badges: [], onlineNote: onlineNoteFor(items, ctx) } };
}

type Solved = { found: Found[]; ctx: Context; selected: { code: string; title: string }[]; notes: string[] };

// Finds all complete schedules (best first). Tries a small set of options per course, then a wider one.
function solve(input: SchedulerInput): Solved {
  const { preferences: prefs, aiRules } = input;
  const notes: string[] = [];

  const ctx = makeContext(input);

  // Selected courses (labs are added automatically, so a lab code on its own is ignored).
  // A course the student already took is never scheduled, even if it was selected.
  const taken = new Set(input.takenCourses.map(normCode));
  const selected = input.selectedCourses
    .map(normCode)
    .filter((code, i, all) => all.indexOf(code) === i)
    .filter((code) => {
      if (!taken.has(code)) return true;
      notes.push(`${code} is already in your taken courses, so it was not scheduled.`);
      return false;
    })
    .map((code) => ({ code, title: findCourse(code)?.title ?? sectionsByCourse.get(code)?.[0]?.title ?? code }))
    .filter((c) => sectionsByCourse.has(c.code) && findCourse(c.code));
  const total = prefs.numCourses > 0 ? prefs.numCourses : selected.length;

  for (const course of selected) {
    const entry = buildOptions(course, ctx, MAX_OPTIONS_PER_COURSE);
    if (entry.open.length + entry.waitlist.length === 0) {
      notes.push(`${course.code} has no section on ${input.campus ?? "your"} campus or online that fits your busy times.`);
    }
  }

  for (const cap of [MAX_OPTIONS_PER_COURSE, WIDER_OPTIONS_PER_COURSE]) {
    const required: Entry[] = selected
      .map((c) => ({ code: c.code, suggested: false, ...buildOptions(c, ctx, cap) }))
      .filter((e) => e.open.length + e.waitlist.length > 0)
      .sort((a, b) => a.open.length + a.waitlist.length - (b.open.length + b.waitlist.length));

    // Open slots beyond the selected courses: level-fitting courses first (see suggestedEntries)
    const extraSlots = Math.max(0, total - selected.length);
    const suggested: Entry[] = extraSlots > 0 ? suggestedEntries(input, ctx, selected.map((c) => c.code)) : [];
    const entries = [...required, ...suggested];

    // If the selected courses cannot all fit, try with one course fewer, and so on
    const start = Math.min(total, required.length);
    for (let target = start; target >= 1; target--) {
      const found = search(entries, target, extraSlots, ctx);
      if (found.length === 0) continue;
      found.sort((a, b) => b.score - a.score);

      const placed = new Set(found[0].items.map((i) => i.code));
      for (const c of selected) {
        if (!placed.has(c.code) && !notes.some((n) => n.startsWith(c.code))) {
          notes.push(`${c.code} did not fit with your other courses and rules, so it was left out.`);
        }
      }
      // Not enough suggested courses fit the preferred days and times: leave the slot empty and say so
      const most = Math.max(...found.map((f) => f.items.length));
      const missing = notes.every((n) => !n.includes("left out")) && most < total;
      if (missing) notes.push(`Couldn’t find a ${ordinal(most + 1)} course that fits your days and times.`);
      return { found, ctx, selected, notes };
    }
  }

  notes.push("No schedule fits all your rules. Try fewer busy times or more campuses/days.");
  return { found: [], ctx, selected, notes };
}

export function buildSchedules(input: SchedulerInput): SchedulerResult {
  const { found, ctx, notes } = solve(input);
  if (found.length === 0) return { schedules: [], notes };

  // Each strategy takes its best schedule. If that is identical to a schedule already chosen, the strategy gets no
  // tab of its own: the earlier tab gets a badge instead ("Also the highest-rated option" / "Also the fewest days").
  const chosen: { strategy: Strategy; f: Found; badges: string[] }[] = [];
  for (const strategy of STRATEGIES) {
    const top = rank(found, strategy)[0];
    const same = chosen.find((c) => signature(c.f.items) === signature(top.items));
    if (!same) chosen.push({ strategy, f: top, badges: [] });
    else if (strategy === "professors") same.badges.push("⭐ Also the highest-rated option");
    else if (strategy === "fewestDays") same.badges.push("📅 Also the fewest days");
  }
  return { schedules: chosen.map((c) => ({ ...toSchedule(c.f, ctx, c.strategy), badges: c.badges })), notes };
}

// "+ Find another": the best balanced schedule that differs from every schedule already shown in at least 2
// courses or professors. Pass every schedule shown so far (tabs and earlier "another" results). null = no more.
export function getNextSchedule(input: SchedulerInput, alreadyShown: Schedule[]): Schedule | null {
  const { found, ctx } = solve(input);
  const next = rank(found, "best").find((f) => alreadyShown.every((s) => differences(f.items, s.items) >= MIN_DIFFERENT));
  return next ? toSchedule(next, ctx, null) : null;
}

// Courses to fill open slots, in this order (max 6):
//  1. electives that match an "interest" rule and fit the student's year (juniors: 2000-4000)
//  2. degree-plan courses that fit the year
//  3. other degree-plan courses not taken yet (required core, even if lower level)
// A course in takenCourses, or whose prerequisites are not all in takenCourses, is never suggested.
function suggestedEntries(input: SchedulerInput, ctx: Context, selectedCodes: string[]): Entry[] {
  const entries: Entry[] = [];
  const taken = new Set(input.takenCourses.map(normCode));
  const used = new Set<string>(selectedCodes);
  const fitLevels = FIT_LEVELS[input.year ?? ""] ?? [];
  const canTake = (c: Course) => !taken.has(normCode(c.code)) && c.prerequisites.every((p) => taken.has(normCode(p)));

  const add = (course: Course, reason: string) => {
    if (entries.length >= MAX_SUGGESTED_CANDIDATES || used.has(course.code) || !canTake(course)) return;
    const options = buildOptions(course, ctx, 3, reason);
    if (options.open.length === 0) return;
    used.add(course.code);
    entries.push({ code: course.code, suggested: true, ...options });
  };

  const plan = getDegreePlan(input.major);
  const planCourses = recommend(input, selectedCodes, 100).map((r) => r.course);
  const planReason = hasOwnPlan(input.major) ? `Required for ${input.major}` : "Required core course";

  if (ctx.interests.length > 0) {
    for (const c of courses) {
      if (c.isElective && !plan.includes(c.code) && (INTEREST_LEVELS[input.year ?? ""] ?? []).includes(c.level) && matchesInterest(c, ctx.interests)) {
        add(c, "Elective that matches your interests");
      }
    }
  }
  for (const c of planCourses) if (fitLevels.includes(c.level)) add(c, planReason);
  for (const c of planCourses) add(c, planReason);
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
