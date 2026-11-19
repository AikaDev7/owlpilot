// Fake courses for the course pickers and the recommendations.
// level = 1000 / 2000 / 3000 / 4000, prerequisites = course codes.
export type Course = { code: string; title: string; level: number; prerequisites: string[] };

// Small helper so the list below stays short. The level comes from the course number (CS 3305 -> 3000).
function course(code: string, title: string, prerequisites: string[] = []): Course {
  const number = Number(code.split(" ")[1]);
  return { code, title, level: Math.floor(number / 1000) * 1000, prerequisites };
}

export const courses: Course[] = [
  course("ENGL 1101", "English Composition I"),
  course("ENGL 1102", "English Composition II", ["ENGL 1101"]),
  course("MATH 1111", "College Algebra"),
  course("MATH 1113", "Precalculus"),
  course("MATH 1190", "Applied Calculus I", ["MATH 1113"]),
  course("MATH 2202", "Applied Calculus II", ["MATH 1190"]),
  course("PHIL 2200", "Ethics"),
  course("CS 1301", "Programming Principles I"),
  course("CS 1302", "Programming Principles II", ["CS 1301"]),
  course("CS 1331", "Intro to Object-Oriented Programming", ["CS 1301"]),
  course("CS 2202", "Discrete Structures", ["CS 1301", "MATH 1113"]),
  course("CS 3305", "Data Structures", ["CS 1302"]),
  course("CS 3306", "Algorithms", ["CS 3305", "CS 2202"]),
  course("CS 3503", "Computer Organization", ["CS 1302"]),
  course("CS 4308", "Operating Systems", ["CS 3305"]),
  course("CS 4850", "Senior Project", ["CS 3306"]),
  course("HIST 2111", "US History"),
  course("HIST 1111", "World History"),
  course("BIOL 1107", "Biology I"),
  course("BIOL 1108", "Biology II", ["BIOL 1107"]),
  course("CHEM 1211", "General Chemistry I"),
  course("PHYS 2211", "Introductory Physics I", ["MATH 1113"]),
  course("PSYC 1101", "Intro to Psychology"),
  course("SOCI 1101", "Intro to Sociology"),
  course("ECON 2105", "Principles of Macroeconomics"),
  course("ECON 2106", "Principles of Microeconomics"),
  course("POLS 1101", "American Government"),
  course("ARTS 1100", "Art Appreciation"),
  course("MUSC 1100", "Music Appreciation"),
  course("COMM 1110", "Public Speaking"),
  course("STAT 1220", "Intro to Statistics", ["MATH 1111"]),
];

// Find a course by its code, e.g. "CS 1301"
export function findCourse(code: string) {
  return courses.find((c) => c.code === code);
}

// "CS 1301 Programming Principles I", the text shown in the search list
export function courseLabel(c: Course) {
  return `${c.code} ${c.title}`;
}
