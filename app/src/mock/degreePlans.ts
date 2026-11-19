// Fake required-course lists (course codes from mock/courses.ts).
const computerScience = [
  "ENGL 1101", "ENGL 1102", "MATH 1113", "MATH 1190", "MATH 2202",
  "CS 1301", "CS 1302", "CS 2202", "CS 3305", "CS 3306", "CS 3503", "CS 4308", "CS 4850",
  "HIST 2111", "POLS 1101",
];

// Used for every major that has no plan of its own yet
const generalCore = [
  "ENGL 1101", "ENGL 1102", "MATH 1113", "HIST 2111", "POLS 1101",
  "PSYC 1101", "COMM 1110", "STAT 1220", "ECON 2105", "BIOL 1107",
];

const plans: Record<string, string[]> = {
  "Computer Science": computerScience,
};

export function getDegreePlan(major: string | null) {
  return (major && plans[major]) || generalCore;
}

// true when the major has its own plan (not the general fallback)
export function hasOwnPlan(major: string | null) {
  return !!major && !!plans[major];
}
