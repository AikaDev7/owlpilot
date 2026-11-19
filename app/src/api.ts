import { AiRules, BusyTime } from "./context/ProfileContext";
// All network calls go through our own server. No API keys live in the app.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function askGemini(prompt: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data.answer;
}

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
  const timer = setTimeout(() => controller.abort(), 20000); // the server itself gives up after 15 seconds
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
