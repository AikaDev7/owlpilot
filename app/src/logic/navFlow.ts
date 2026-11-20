// Navigation actions used by Results. Kept in one place so the stack order can be tested without a phone.
// Stack: ... → SelectCourses → Preferences → Results (Building is replaced by Results, so it never stays).
type NavLike = {
  goBack: () => void;
  popTo: (name: "SelectCourses" | "Preferences", params?: undefined) => void;
};

// "Back to Preferences": go back (pops Results), never push a second Preferences screen
export function backToPreferences(nav: NavLike) {
  nav.goBack();
}

// "Change courses": jump back to Step 2, removing Preferences and Results from the stack
export function changeCourses(nav: NavLike) {
  nav.popTo("SelectCourses");
}
