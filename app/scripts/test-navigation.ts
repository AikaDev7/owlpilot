// Simulates the native stack (navigate = push, replace, goBack, popTo) and checks the order of screens.
import { backToPreferences, changeCourses } from "../src/logic/navFlow";

function makeNav(stack: string[]) {
  return {
    stack,
    navigate: (n: string) => void stack.push(n),
    replace: (n: string) => void (stack[stack.length - 1] = n),
    goBack: () => void stack.pop(),
    popTo: (n: string) => {
      const i = stack.lastIndexOf(n);
      if (i >= 0) stack.length = i + 1;
      else stack.push(n);
    },
  };
}
let failed = 0;
function check(name: string, got: string[], want: string[]) {
  const ok = got.join(">") === want.join(">");
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${got.join(" > ")}`);
}

// Generate → Building → Results (replace)
const nav = makeNav(["Welcome", "AboutYou", "SelectCourses", "Preferences"]);
nav.navigate("Building");
nav.replace("Results");
check("after generate", nav.stack, ["Welcome", "AboutYou", "SelectCourses", "Preferences", "Results"]);

// Back to Preferences, generate again: no duplicates
backToPreferences(nav);
check("back to preferences", nav.stack, ["Welcome", "AboutYou", "SelectCourses", "Preferences"]);
nav.navigate("Building");
nav.replace("Results");
check("second generate", nav.stack, ["Welcome", "AboutYou", "SelectCourses", "Preferences", "Results"]);

// Back order: Results → Step 3 → Step 2 → Step 1
const order: string[] = [];
for (let i = 0; i < 4; i++) {
  nav.goBack();
  order.push(nav.stack[nav.stack.length - 1]);
}
check("back order", order, ["Preferences", "SelectCourses", "AboutYou", "Welcome"]);

// Change courses jumps to Step 2
const nav2 = makeNav(["Welcome", "AboutYou", "SelectCourses", "Preferences", "Results"]);
changeCourses(nav2);
check("change courses", nav2.stack, ["Welcome", "AboutYou", "SelectCourses"]);

if (failed) throw new Error(`${failed} navigation check(s) failed`);
