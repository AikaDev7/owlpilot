// Runs the scheduler for a demo student and prints the results: npm run test:scheduler
// (add "extra" to also run a case that fills open slots with suggested courses)
import { buildSchedules, meetingLines, Schedule, SchedulerInput } from "../src/logic/scheduler";
import { AiRules } from "../src/context/ProfileContext";

declare const process: { argv: string[] }; // Node global (no @types/node in this project)

const student: Omit<SchedulerInput, "aiRules"> = {
  major: "Computer Science",
  year: "Junior",
  campus: "Marietta",
  takenCourses: ["CSE 1321", "CSE 1322", "MATH 1190", "ENGL 1101", "ENGL 1102"],
  selectedCourses: ["CS 3305", "CSE 2300", "AI 4732", "CS 3503"],
  preferences: {
    numCourses: 4,
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    times: ["Morning", "Afternoon"],
    numOnline: 4,
    notes: "",
    busyTimes: [],
  },
};

// What POST /api/parse-preferences returns for "I work Tuesday evenings"
const worksTuesdayEvenings: AiRules = {
  hardRules: [{ day: "Tue", start: "17:00", end: "22:00" }],
  softRules: [],
  summary: ["You work Tuesday evenings, so no classes then."],
};

const interestedInAi: AiRules = {
  hardRules: [],
  softRules: [{ type: "interest", value: "AI", note: "Likes AI" }],
  summary: ["You like AI."],
};

function printSchedule(title: string, s: Schedule) {
  console.log(`\n${title}  (score ${s.score}, avg professor rating ${s.avgRating}, ${s.daysOnCampus} days on campus)`);
  for (const item of s.items) {
    const rating = item.rating === null ? "no ratings yet" : `${item.rating}/5`;
    const badges = [
      item.waitlist ? `Full, waitlist (${item.waitCount})` : "",
      item.suggested ? `Suggested: ${item.suggestedReason}` : "",
      item.online ? "Online" : "",
    ].filter(Boolean);
    console.log(`  ${item.code} ${item.title} | ${item.professor} (${rating}) ${badges.map((b) => `[${b}]`).join(" ")}`);
    for (const line of meetingLines(item)) console.log(`      ${line}`);
  }
}

function run(name: string, input: SchedulerInput) {
  console.log(`\n==================== ${name} ====================`);
  const t0 = Date.now();
  const result = buildSchedules(input);
  console.log(`(${Date.now() - t0} ms)`);
  result.schedules.forEach((s, i) => printSchedule(`Schedule ${i + 1}`, s));
  if (result.worthConsidering) printSchedule("Worth considering", result.worthConsidering);
  else console.log("\nNo \"Worth considering\" schedule.");
  for (const n of result.notes) console.log(`Note: ${n}`);
}

run("No notes", { ...student, aiRules: null });
run('Notes: "I work Tuesday evenings"', { ...student, aiRules: worksTuesdayEvenings });
if (process.argv.includes("extra")) {
  const prefs = { ...student.preferences, numCourses: 6 };
  run("6 courses + interest in AI (fills open slots)", { ...student, preferences: prefs, aiRules: interestedInAi });
}
