import { AiRules, BusyTime } from "./context/ProfileContext";
// All network calls go through our own server. No API keys live in the app.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Asks Gemini (through our server) to turn the free-text notes into rules.
// Never throws: if anything goes wrong we return empty rules plus error "AI unavailable".
export async function parsePreferences(input: {
  notes: string;
  days: string[];
  times: string[];
  busyTimes: BusyTime[];
  numCourses: number;
  numOnline: number;
}): Promise<AiRules> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // longer than the server's ~25 second limit, so the app never gives up first
  try {
    const response = await fetch(`${API_URL}/api/parse-preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const data = await response.json();
    return {
      hardRules: Array.isArray(data.hardRules) ? data.hardRules : [],
      softRules: Array.isArray(data.softRules) ? data.softRules : [],
      summary: Array.isArray(data.summary) ? data.summary : [],
      error: data.error,
    };
  } catch {
    return { hardRules: [], softRules: [], summary: [], error: "AI unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

// What the server needs to explain one schedule (see buildExplainRequest in logic/explain.ts)
export type ExplainClass = {
  course: string;
  title: string;
  professor: string;
  rating: number | null;
  difficulty: number | null;
  wouldTakeAgain: number | null;
  meets: string[];
  tags: string[];
  replaces?: string; // alternatives only: the professor currently in the schedule
  reason?: string; // alternatives only: why the section was not picked
};

export type ExplainRequest = {
  preferences: string[];
  strategy: string;
  badges: string[];
  classes: ExplainClass[];
  alternatives: ExplainClass[];
  reviews: Record<string, { course: string; quality: number; difficulty: number; text: string }[]>;
};

export type Explanation = { why: string; professors: { name: string; summary: string }[]; error?: string };

// Asks Gemini (through our server) why a schedule fits and what students say about each professor.
// Never throws: on any problem we return an empty explanation plus error "AI unavailable".
export async function explainSchedule(input: ExplainRequest): Promise<Explanation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}/api/explain-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const data = await response.json();
    return {
      why: typeof data.why === "string" ? data.why : "",
      professors: Array.isArray(data.professors) ? data.professors : [],
      error: data.error,
    };
  } catch {
    return { why: "", professors: [], error: "AI unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

// What the server read from one photo of a sign (POST /api/read-sign)
export type SignResult = {
  kind: "room" | "landmark" | "none";
  room: string | null; // "Q-207" (the sign closest to the photo center)
  allRooms?: string[]; // every room number visible
  landmark: "stairs" | "elevator" | "entrance" | "restroom" | "exit" | null;
  confidence: number; // 0-1
  error?: string;
};

// Sends ONE small JPEG (base64) to our server. Never throws: on any problem it returns kind "none" plus error.
export async function readSign(imageBase64: string): Promise<SignResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}/api/read-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });
    const data = await response.json();
    return {
      kind: data.kind === "room" || data.kind === "landmark" ? data.kind : "none",
      room: typeof data.room === "string" ? data.room : null,
      allRooms: Array.isArray(data.allRooms) ? data.allRooms.filter((r: unknown) => typeof r === "string") : [],
      landmark: typeof data.landmark === "string" ? data.landmark : null,
      confidence: typeof data.confidence === "number" ? data.confidence : 0,
      error: data.error,
    };
  } catch {
    return { kind: "none", room: null, landmark: null, confidence: 0, error: "AI unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
