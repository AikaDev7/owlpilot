// Typed access to the real KSU section data (sections.json, see README.md in this folder).
import sectionsJson from "./sections.json";
import professorsJson from "./professors.json";

export type Meeting = {
  days: string[]; // "Mon".."Fri"
  start: string; // "HH:MM" 24-hour
  end: string;
  building: string;
  buildingName: string;
  room: string;
};

export type Section = {
  term: string;
  course: string; // "CS 3305", labs end with L ("CSE 1321L")
  title: string;
  honors: boolean;
  crn: string;
  section: string;
  professor: string; // "First Last" or "TBA"
  campus: string; // "Marietta Campus" | "Kennesaw Campus" | "KSU Online" | "eCore"
  mode: string; // "Traditional F2F", "Fully at a Distance", "Hybrid - 50 percent Online", ...
  credits: number;
  meetings: Meeting[]; // empty = asynchronous online
  capacity: number;
  enrolled: number;
  seatsAvailable: number;
  waitCount: number;
  waitCapacity: number;
  isFull: boolean;
};

export type Professor = {
  name: string;
  department: string;
  courses: string[];
  rating: number | null; // 0-5
  difficulty: number | null;
  wouldTakeAgain: number | null;
  numRatings: number;
  rmpUrl: string;
};

export const sections = sectionsJson as Section[];
export const professors = professorsJson as Professor[];

// Professor name -> ratings (professors not in the file have no ratings)
const professorByName = new Map<string, Professor>();
for (const p of professors) professorByName.set(p.name, p);

export function findProfessor(name: string): Professor | undefined {
  return professorByName.get(name);
}

// Building to show: the letter code ("Q") when it is a letter, otherwise the name (codes like "0970" mean nothing to students)
// Full building name for display everywhere ("Engineering Technology Center"), never a bare letter
export function buildingFullName(code: string, name: string) {
  return name || code;
}

export function buildingLabel(code: string, name: string) {
  return /^[A-Za-z]+$/.test(code) || !name ? code : name;
}
