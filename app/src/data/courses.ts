// Real course list, built from the unique courses in sections.json (code + title).
// Lab sections (CSE 1321L) are not listed: the scheduler pairs them with their lecture automatically.
import { sections } from "./sections";

// level = 1000 / 2000 / 3000 / 4000, prerequisites = course codes.
export type Course = { code: string; title: string; level: number; prerequisites: string[]; isElective?: boolean };

// The section data has no prerequisites, so these are hand-written and only approximate (not from the catalog).
// Courses that are not listed here have none.
const prerequisites: Record<string, string[]> = {
  "ENGL 1102": ["ENGL 1101"],
  "MATH 1190": ["MATH 1113"],
  "MATH 2202": ["MATH 1190"],
  "CSE 1322": ["CSE 1321"],
  "CSE 2300": ["CSE 1321"],
  "CS 3305": ["CSE 1322"],
  "CS 3410": ["CSE 1322"],
  "CS 3503": ["CSE 1322"],
  "CS 3502": ["CS 3305", "CS 3503"],
  "CS 4306": ["CS 3305", "CSE 2300"],
  "CS 4308": ["CS 3305"],
  "CS 4850": ["CS 4306"],
  "AI 3642": ["CS 3305"],
  "AI 4267": ["AI 3642"],
  "AI 4277": ["AI 3642"],
  "AI 4732": ["AI 3642"],
  "AI 4742": ["AI 3642"],
};

// Electives for the degree plan: PSYC 1101 and the AI courses
function isElectiveCode(code: string) {
  return code === "PSYC 1101" || code.startsWith("AI ");
}

// "CS 3305" -> 3000, "CSE 1321" -> 1000
function levelOf(code: string) {
  const number = parseInt(code.split(" ")[1], 10);
  return Math.floor(number / 1000) * 1000;
}

function isLab(code: string, allCodes: Set<string>) {
  return code.endsWith("L") && allCodes.has(code.slice(0, -1));
}

// Unique courses from the sections (first title wins), labs left out, sorted by code
function buildCourses(): Course[] {
  const titles = new Map<string, string>();
  for (const s of sections) if (!titles.has(s.course)) titles.set(s.course, s.title);
  const codes = new Set(titles.keys());

  const list: Course[] = [];
  for (const [code, title] of titles) {
    if (isLab(code, codes)) continue;
    const c: Course = { code, title, level: levelOf(code), prerequisites: prerequisites[code] ?? [] };
    if (isElectiveCode(code)) c.isElective = true;
    list.push(c);
  }
  return list.sort((a, b) => a.code.localeCompare(b.code));
}

export const courses: Course[] = buildCourses();

// Find a course by its code, e.g. "CS 3305"
export function findCourse(code: string) {
  return courses.find((c) => c.code === code);
}

// "CS 3305 Data Structures", the text shown in the search list
export function courseLabel(c: Course) {
  return `${c.code} ${c.title}`;
}

// "CS 3305 Data Structures" -> "CS 3305", used as the React key in course lists
export function courseKey(label: string) {
  return label.split(" ").slice(0, 2).join(" ");
}
