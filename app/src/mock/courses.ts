// Fake intro courses for the "Previously Taken Courses" picker.
export type Course = { code: string; title: string };

export const courses: Course[] = [
  { code: "ENGL 1101", title: "English Composition I" },
  { code: "ENGL 1102", title: "English Composition II" },
  { code: "MATH 1111", title: "College Algebra" },
  { code: "MATH 1113", title: "Precalculus" },
  { code: "MATH 2211", title: "Calculus I" },
  { code: "MATH 2212", title: "Calculus II" },
  { code: "PHIL 2200", title: "Ethics" },
  { code: "CS 1301", title: "Programming Principles I" },
  { code: "CS 1302", title: "Programming Principles II" },
  { code: "CS 1331", title: "Intro to Object-Oriented Programming" },
  { code: "HIST 2111", title: "US History" },
  { code: "HIST 1111", title: "World History" },
  { code: "BIOL 1107", title: "Biology I" },
  { code: "BIOL 1108", title: "Biology II" },
  { code: "CHEM 1211", title: "General Chemistry I" },
  { code: "PHYS 2211", title: "Introductory Physics I" },
  { code: "PSYC 1101", title: "Intro to Psychology" },
  { code: "SOCI 1101", title: "Intro to Sociology" },
  { code: "ECON 2105", title: "Principles of Macroeconomics" },
  { code: "ECON 2106", title: "Principles of Microeconomics" },
  { code: "POLS 1101", title: "American Government" },
  { code: "ARTS 1100", title: "Art Appreciation" },
  { code: "MUSC 1100", title: "Music Appreciation" },
  { code: "COMM 1110", title: "Public Speaking" },
  { code: "STAT 1220", title: "Intro to Statistics" },
];

// "CS 1301 Programming Principles I", the text shown in the search list
export function courseLabel(c: Course) {
  return `${c.code} ${c.title}`;
}
