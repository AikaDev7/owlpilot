// Degree plans (course codes from data/courses.ts). The Computer Science plan uses real KSU codes;
// there is no real data for other majors yet, so they share a general core list.
// Electives (PSYC 1101 and the AI courses) are not listed here: they are marked isElective in data/courses.ts.
const computerScience = [
  "CSE 1321", "CSE 1322", "CSE 2300",
  "CS 3305", "CS 3410", "CS 3502", "CS 3503", "CS 4306", "CS 4308", "CS 4850",
  "MATH 1190", "MATH 2202",
  "ENGL 1101", "ENGL 1102", "HIST 2111", "POLS 1101",
];

// Used for every major that has no plan of its own yet
const generalCore = ["ENGL 1101", "ENGL 1102", "MATH 1113", "HIST 2111", "POLS 1101", "PSYC 1101"];

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
