import { Course, findCourse } from "../data/courses";
import { getDegreePlan, hasOwnPlan } from "../mock/degreePlans";
import { Profile } from "../context/ProfileContext";

type Recommendation = { course: Course; reason: string };

// Which course levels fit each year (Freshman 1000, Sophomore 1000-2000, ...)
const levelsForYear: Record<string, number[]> = {
  Freshman: [1000],
  Sophomore: [1000, 2000],
  Junior: [2000, 3000],
  Senior: [3000, 4000],
};

// Up to 5 courses from the degree plan that the user can take now:
// not taken yet, not already selected, and every prerequisite is in takenCourses.
export function recommend(profile: Pick<Profile, "major" | "year" | "takenCourses">, selectedCodes: string[], max = 5): Recommendation[] {
  const fitLevels = (profile.year && levelsForYear[profile.year]) || [];

  const options = getDegreePlan(profile.major)
    .map(findCourse)
    .filter((c): c is Course => c !== undefined)
    .filter((c) => !profile.takenCourses.includes(c.code) && !selectedCodes.includes(c.code))
    .filter((c) => c.prerequisites.every((p) => profile.takenCourses.includes(p)));

  // Courses that fit the year first, then lower levels first
  options.sort((a, b) => {
    const aFits = fitLevels.includes(a.level) ? 0 : 1;
    const bFits = fitLevels.includes(b.level) ? 0 : 1;
    return aFits - bFits || a.level - b.level || a.code.localeCompare(b.code);
  });

  return options.slice(0, max).map((course) => ({
    course,
    reason:
      course.prerequisites.length > 0
        ? `Prereq done: ${course.prerequisites.join(", ")}`
        : hasOwnPlan(profile.major)
          ? `Required for ${profile.major}`
          : "Core requirement",
  }));
}
