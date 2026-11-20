// Builds the request for POST /api/explain-schedule from ONE schedule (plain code, no AI).
import type { ExplainClass, ExplainRequest } from "../api";
import type { Preferences } from "../context/ProfileContext";
import { busyTimeLabel } from "../data/schedule";
import { reviewsFor } from "../data/reviews";
import { findProfessor } from "../data/sections";
import { meetingLines, Schedule, ScheduleItem, Strategy } from "./scheduler";

const STRATEGY_NAMES: Record<Strategy, string> = { best: "Best Schedule", professors: "Best Professors", fewestDays: "Fewest Days" };

function classInfo(item: ScheduleItem): ExplainClass {
  const prof = findProfessor(item.professor);
  const tags: string[] = [...item.tags];
  if (item.suggested) tags.push("suggested");
  if (item.waitlist) tags.push("waitlist");
  if (item.online) tags.push("online");
  return {
    course: item.code,
    title: item.title,
    professor: item.professor,
    rating: item.rating,
    difficulty: item.difficulty,
    wouldTakeAgain: prof?.wouldTakeAgain ?? null,
    meets: meetingLines(item).map((line) => line.split(" · ")[0]),
    tags,
  };
}

// Same schedule + same summary = same key, so an explanation is only requested once per schedule
export function explainKey(schedule: Schedule, summary: string[]) {
  const items = schedule.items.map((i) => `${i.code}|${i.professor}|${meetingLines(i).join(",")}`);
  return `${items.join(";")}#${summary.join("|")}`;
}

export function buildExplainRequest(schedule: Schedule, preferences: Preferences, summary: string[]): ExplainRequest {
  const classes = schedule.items.map(classInfo);
  const alternatives = schedule.items
    .filter((i) => i.alternative)
    .map((i) => ({ ...classInfo(i.alternative!.item), replaces: i.professor, reason: i.alternative!.reason }));

  const reviews: ExplainRequest["reviews"] = {};
  for (const c of [...classes, ...alternatives]) {
    if (reviews[c.professor]) continue;
    reviews[c.professor] = reviewsFor(c.professor, 5).map(({ course, quality, difficulty, text }) => ({ course, quality, difficulty, text }));
  }

  const chips = [
    `Preferred days: ${preferences.days.join(", ")}`,
    `Preferred times: ${preferences.times.join(", ")}`,
    `Online classes allowed: ${preferences.numOnline}`,
    ...preferences.busyTimes.map((b) => `Can't take classes: ${busyTimeLabel(b.days, b.start, b.end)}`),
  ];

  return {
    preferences: [...summary, ...chips],
    strategy: schedule.strategy ? STRATEGY_NAMES[schedule.strategy] : "Extra option",
    badges: schedule.badges,
    classes,
    alternatives,
    reviews,
  };
}
