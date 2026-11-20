// Degree-plan prerequisites (data/degreePlan.json): which prerequisites a course still needs. Plain code, no AI.
import degreePlan from "../data/degreePlan.json";
import { normCode } from "./scheduler";

type PlanCourse = { code: string; title: string; prerequisites: (string | string[])[] }; // inner array = OR

export const planCourses = degreePlan.courses as PlanCourse[];

// Codes that count as the same course ("CSE 2300" = "MATH 2345", "AI 3642" = "CS 3642")
const sameAs = new Map<string, Set<string>>();
for (const [code, others] of Object.entries(degreePlan.equivalents as Record<string, string[]>)) {
  const codes = new Set([code, ...others]);
  for (const c of codes) sameAs.set(c, codes);
}
export const group = (code: string) => sameAs.get(code) ?? new Set([code]);
export const hasAny = (codes: Set<string>, code: string) => [...group(code)].some((c) => codes.has(c));

export function planCourseOf(code: string) {
  return planCourses.find((c) => group(c.code).has(code));
}

// Prerequisites that are not taken yet (an inner array means any one of them is enough, so it is listed as "A or B")
function missingOf(course: PlanCourse, taken: Set<string>) {
  return course.prerequisites
    .filter((p) => !(Array.isArray(p) ? p.some((x) => hasAny(taken, normCode(x))) : hasAny(taken, normCode(p))))
    .map((p) => (Array.isArray(p) ? p.join(" or ") : p));
}

// Every prerequisite is taken
export function prerequisitesMet(course: PlanCourse, taken: Set<string>) {
  return missingOf(course, taken).length === 0;
}

// "AI 3642 requires CS 3305 first." or null. Only courses taken before count: a prerequisite selected this semester is still missing.
export function prereqWarning(code: string, takenCourses: string[]): string | null {
  const course = planCourseOf(normCode(code));
  if (!course) return null;
  const missing = missingOf(course, new Set(takenCourses.map(normCode)));
  return missing.length > 0 ? `${normCode(code)} requires ${missing.join(" and ")} first.` : null;
}
