// "Mini academic advisor" for one semester (plain code, no AI): ideas to swap a course in the schedule for
// another course of the degree plan whose professor is rated clearly higher. Both courses count toward the degree,
// so the student can take one now and the other next semester. Uses data/degreePlan.json (not sections.json in full).
import { findCourse } from "../data/courses";
import { group, hasAny, planCourseOf, planCourses, prerequisitesMet } from "./prereqs";
import { allItems, blocksConflict, fitsPreferences, makeContext, normCode, NO_RATING_SCORE, Schedule, ScheduleItem, SchedulerInput } from "./scheduler";

const MIN_COURSE_SWAP_GAIN = 1.0; // the new professor must be rated this much higher than the replaced one
const MAX_COURSE_SWAPS = 2;

export type CourseSwap = {
  index: number; // position of the replaced course in schedule.items
  replaces: ScheduleItem;
  item: ScheduleItem; // the new course (open section)
  gain: number; // rating difference
};

// Is `code` a prerequisite of another course in the schedule?
function neededByOther(code: string, schedule: Schedule, index: number) {
  return schedule.items.some((other, i) => {
    if (i === index) return false;
    const plan = planCourseOf(other.code);
    return !!plan && plan.prerequisites.flat().some((p) => group(normCode(p)).has(code));
  });
}

// Up to 2 "Swap the course" ideas for this schedule (best rating gain first, each course used once)
export function courseSwapIdeas(input: SchedulerInput, schedule: Schedule): CourseSwap[] {
  const ctx = makeContext(input);
  const taken = new Set(input.takenCourses.map(normCode));
  const inSchedule = new Set(schedule.items.map((i) => i.code));

  // Candidates: in the degree plan, not taken (or an equivalent), not in the schedule, prerequisites done
  const candidates: ScheduleItem[][] = [];
  for (const course of planCourses) {
    if (hasAny(taken, course.code) || hasAny(inSchedule, course.code) || !prerequisitesMet(course, taken)) continue;
    for (const code of group(course.code)) {
      // Open sections only, on the chosen campus or online, outside busy times and AI hard rules (allItems)
      const options = allItems({ code, title: findCourse(code)?.title ?? course.title }, ctx, undefined, true).filter((i) => !i.waitlist);
      if (options.length > 0) {
        candidates.push(options);
        break;
      }
    }
  }

  const ideas: CourseSwap[] = [];
  schedule.items.forEach((replaces, index) => {
    if (!planCourseOf(replaces.code) || neededByOther(replaces.code, schedule, index)) return; // both must count toward the degree
    const others = schedule.items.filter((_, i) => i !== index);
    const onlineOthers = others.filter((o) => o.online).length;
    const needed = (replaces.rating ?? NO_RATING_SCORE) + MIN_COURSE_SWAP_GAIN;
    for (const options of candidates) {
      let best: ScheduleItem | null = null;
      for (const cand of options) {
        if (cand.rating === null || cand.rating < needed) continue; // no ratings never counts as better
        if (cand.online && onlineOthers + 1 > input.preferences.numOnline) continue;
        if (others.some((o) => blocksConflict(o.blocks, cand.blocks))) continue;
        const better = !best || cand.rating > best.rating! || (cand.rating === best.rating && fitsPreferences(cand, ctx) && !fitsPreferences(best, ctx));
        if (better) best = cand;
      }
      if (best) ideas.push({ index, replaces, item: best, gain: best.rating! - (replaces.rating ?? NO_RATING_SCORE) });
    }
  });

  ideas.sort((a, b) => b.gain - a.gain);
  const result: CourseSwap[] = [];
  for (const idea of ideas) {
    if (result.some((r) => r.index === idea.index || r.item.code === idea.item.code)) continue;
    result.push(idea);
    if (result.length === MAX_COURSE_SWAPS) break;
  }
  return result;
}

const rated = (i: ScheduleItem) => (i.rating === null ? "no ratings" : `${i.rating.toFixed(1)}★`);

// "Take CS 4722 with Alan Shaw (4.0★) now instead of CS 4308 with Emin Mary Abraham (2.3★)"
export function courseSwapLine(s: CourseSwap) {
  return `Take ${s.item.code} with ${s.item.professor} (${rated(s.item)}) now instead of ${s.replaces.code} with ${s.replaces.professor} (${rated(s.replaces)})`;
}
