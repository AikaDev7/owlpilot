// Runs the scheduler for a demo student and prints the results: npm run test:scheduler
// (add "extra" to also run a case that fills open slots with suggested courses)
import { buildSchedules, getNextSchedule, meetingLines, Schedule, SchedulerInput } from "../src/logic/scheduler";
import { AiRules } from "../src/context/ProfileContext";

declare const process: { argv: string[] }; // Node global (no @types/node in this project)

const student: Omit<SchedulerInput, "aiRules"> = {
  major: "Computer Science",
  year: "Junior",
  campus: "Marietta",
  takenCourses: ["CSE 1321", "CSE 1322", "MATH 1190", "ENGL 1101", "ENGL 1102"],
  selectedCourses: ["CS 3305", "CSE 2300", "AI 4732", "CS 3503"],
  preferences: {
    numCourses: 5,
    days: ["Mon", "Tue", "Wed", "Thu"],
    times: ["Morning", "Afternoon"],
    numOnline: 1,
    notes: "",
    busyTimes: [{ days: ["Fri"], start: 13 * 60, end: 18 * 60 }],
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

const strategyNames = { best: "Best Schedule", professors: "Best Professors", fewestDays: "Fewest Days" };

function printSchedule(title: string, s: Schedule) {
  if (s.strategy) title = `${strategyNames[s.strategy]}`;
  console.log(`\n${title}: ${s.highlight}`);
  if (s.badges.length > 0) console.log(`  Badges: ${s.badges.join(" | ")}`);
  if (s.onlineNote) console.log(`  ${s.onlineNote}`);
  console.log(`  (score ${s.score}, avg professor rating ${s.avgRating}, ${s.daysOnCampus} days on campus)`);
  for (const o of s.waitlistOptions) {
    console.log(`  Waitlist option (${o.reason}): ${o.item.code} ${o.item.professor} (${o.item.rating}/5) ${meetingLines(o.item).join(" | ")}`);
  }
  for (const item of s.items) {
    const rating = item.rating === null ? "no ratings yet" : `${item.rating}/5`;
    const badges = [
      item.waitlist ? `Full, waitlist (${item.waitCount})` : "",
      item.suggested ? `Suggested: ${item.suggestedReason}` : "",
      item.online ? "Online" : "",
      ...item.tags,
    ].filter(Boolean);
    console.log(`  ${item.code} ${item.title} | ${item.professor} (${rating}) ${badges.map((b) => `[${b}]`).join(" ")}`);
    for (const line of meetingLines(item)) console.log(`      ${line}`);
    if (item.alternative) {
      const a = item.alternative;
      console.log(`      -> Upgrade your professor (${a.reason}): ${a.item.professor} (${a.item.rating}/5) ${meetingLines(a.item).join(" | ")}`);
    }
  }
}

function run(name: string, input: SchedulerInput) {
  console.log(`\n==================== ${name} ====================`);
  const t0 = Date.now();
  const result = buildSchedules(input);
  console.log(`(${Date.now() - t0} ms)`);
  result.schedules.forEach((s, i) => printSchedule(`Schedule ${i + 1}`, s));
  for (const n of result.notes) console.log(`Note: ${n}`);
}

// What the AI returns for "I want AI courses" (hard-coded, Gemini is not called)
run("Junior CS, 5 courses, interest AI", { ...student, aiRules: interestedInAi });
run("Same, no AI rules (no interest)", { ...student, aiRules: null });
run('Same + "I work Tuesday evenings"', { ...student, aiRules: { ...worksTuesdayEvenings, softRules: interestedInAi.softRules } });

// Senior demo: checks that no strategy tab uses a full section
const senior: SchedulerInput = {
  major: "Computer Science",
  year: "Senior",
  campus: "Marietta",
  takenCourses: ["CSE 1321", "CSE 1322", "MATH 1190", "ENGL 1101", "ENGL 1102", "CSE 2300", "CS 3305", "CS 3503"],
  selectedCourses: ["AI 4732", "CS 4722", "CS 4306", "AI 3642"],
  preferences: {
    numCourses: 4,
    days: ["Mon", "Tue", "Wed", "Thu"],
    times: ["Afternoon"],
    numOnline: 1,
    notes: "",
    busyTimes: [{ days: ["Mon"], start: 8 * 60, end: 12 * 60 }],
  },
  aiRules: null,
};
function checkNoFull(name: string, input: SchedulerInput) {
  run(name, input);
  const tabs = buildSchedules(input).schedules;
  const fullTabs = tabs.flatMap((s) => s.items.filter((i) => i.waitlist).map((i) => `${s.strategy}: ${i.code}`));
  console.log(fullTabs.length === 0 ? "\nCHECK: no tab includes a full section" : `\nCHECK FAILED: full sections in tabs -> ${fullTabs.join(", ")}`);
}
checkNoFull("Senior demo (4 courses, Afternoon, busy Mon 8-12)", senior);
// CS 4504 has no open section at Marietta: it must be left out (with a waitlist option) and a suggested course may fill the slot
checkNoFull("Senior with a full course (CS 4504)", { ...senior, selectedCourses: ["AI 4732", "CS 4722", "CS 4504", "AI 3642"] });

// "Find another option"
const input: SchedulerInput = { ...student, aiRules: interestedInAi };
const shown = buildSchedules(input).schedules;
for (let i = 0; i < 2; i++) {
  const next = getNextSchedule(input, shown);
  if (!next) { console.log("\nNo more options."); break; }
  printSchedule(`Another option #${i + 1}`, next);
  shown.push(next);
}
