// OwlPilot server: the app talks to this, and only this server talks to Gemini.
// That way GEMINI_API_KEY never ends up inside the app.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Quick check that the server is running
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Body: { "prompt": "your question" }  ->  Reply: { "answer": "..." }
app.post("/api/ask", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set in server/.env" });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini error" });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong calling Gemini" });
  }
});

// ---------- Preference parsing ----------
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SOFT_TYPES = ["avoidLongGaps", "maxClassesPerDay", "preferDay", "avoidDay", "preferTime", "avoidTime", "interest", "other"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMPTY_RULES = { hardRules: [], softRules: [], summary: [] };

// Gemini's responseSchema (OpenAPI-style subset)
const PREFERENCES_SCHEMA = {
  type: "OBJECT",
  properties: {
    hardRules: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "STRING", format: "enum", enum: DAY_NAMES },
          start: { type: "STRING" },
          end: { type: "STRING" },
        },
        required: ["day", "start", "end"],
      },
    },
    softRules: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", format: "enum", enum: SOFT_TYPES },
          value: { type: "STRING" },
          note: { type: "STRING" },
        },
        required: ["type", "value", "note"],
      },
    },
    summary: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["hardRules", "softRules", "summary"],
};

function buildPreferencePrompt({ notes, days, times, busyTimes, numCourses, numOnline }) {
  return `You turn a college student's free-text schedule notes into structured rules for a class scheduler.

Student's notes (the only source of rules):
"""
${notes}
"""

Other answers the student picked with buttons (context only, do not repeat them as rules):
- Preferred days: ${JSON.stringify(days)}
- Preferred class times: ${JSON.stringify(times)}
- Busy times already entered: ${JSON.stringify(busyTimes)} (minutes after midnight)
- Number of courses: ${numCourses}, online classes: ${numOnline}

Rules:
- The notes override the button answers when they conflict.
- Never invent rules that are not in the notes. If the notes contain nothing usable, return empty arrays.
- All times are within 07:00-22:00, 24-hour "HH:MM". Days are Mon, Tue, Wed, Thu, Fri.
- hardRules: ONLY times the student truly cannot attend class, as {day, start, end}. Use a hard rule for real obligations or unavailability: work, practice, a commitment, "I'm not available", "I can't", "I'm busy". A whole day off means that day 07:00-22:00.
- Dislikes are NOT hard rules. Words like "hate", "dislike", "prefer not", "would rather not", "don't like", "avoid" become softRules (avoidDay for a day, avoidTime for a time of day) and add nothing to hardRules.
- If the student says they are only free in some window, block everything else that day. Example: "on Monday I'm only free 9-10 AM" -> Mon 07:00-09:00 and Mon 10:00-22:00. "I work Tuesday evenings" -> Tue 17:00-22:00.
- softRules: preferences, as {type, value, note}. type is one of: avoidLongGaps, maxClassesPerDay, preferDay, avoidDay, preferTime, avoidTime, interest, other. value is a short string (a number for maxClassesPerDay, a day for preferDay/avoidDay, Morning/Afternoon/Evening for preferTime/avoidTime, the subject for interest, otherwise a few words). note is a short explanation.
- Use "interest" for each subject the student likes, one rule per subject ("I'm interested in psychology and art" -> two interest rules).
- summary: 2-5 short, friendly bullets of what you understood, e.g. "Monday: only 9-10 AM", "Interested in psychology".`;
}

// Keep only well-formed rules, whatever Gemini sent back
function cleanRules(raw) {
  const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const hardRules = (Array.isArray(raw?.hardRules) ? raw.hardRules : []).filter(
    (r) =>
      r &&
      DAY_NAMES.includes(r.day) &&
      typeof r.start === "string" &&
      typeof r.end === "string" &&
      TIME_RE.test(r.start) &&
      TIME_RE.test(r.end) &&
      toMinutes(r.start) >= 7 * 60 &&
      toMinutes(r.end) <= 22 * 60 &&
      toMinutes(r.start) < toMinutes(r.end)
  ).map((r) => ({ day: r.day, start: r.start, end: r.end }));

  const softRules = (Array.isArray(raw?.softRules) ? raw.softRules : [])
    .filter((r) => r && SOFT_TYPES.includes(r.type) && typeof r.value === "string")
    .map((r) => ({ type: r.type, value: r.value.trim(), note: typeof r.note === "string" ? r.note.trim() : "" }));

  const summary = (Array.isArray(raw?.summary) ? raw.summary : [])
    .filter((s) => typeof s === "string" && s.trim())
    .map((s) => s.trim())
    .slice(0, 5);

  return { hardRules, softRules, summary };
}

// ---------- Reliable Gemini calls: retries, fallback model, cache ----------
const MAX_TOTAL_MS = 25000; // the whole request stays under about 25 seconds
const ATTEMPT_TIMEOUT_MS = 12000; // one Gemini call
const RETRY_DELAYS_MS = [1000, 2000]; // wait before retry 1 and retry 2
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One Gemini call. Returns the parsed rules, or throws an Error with `retryable` set.
async function callGeminiOnce(model, prompt, timeoutMs) {
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: PREFERENCES_SCHEMA, temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // timeout or network problem: worth retrying
    const e = new Error(err.name === "TimeoutError" ? "timeout" : "network error");
    e.retryable = true;
    throw e;
  }

  if (!response.ok) {
    let message = "";
    try {
      message = (await response.json()).error?.message || "";
    } catch {}
    const e = new Error(`HTTP ${response.status} ${message.slice(0, 80)}`.trim());
    e.retryable = response.status === 503 || response.status === 429;
    throw e;
  }

  try {
    const data = await response.json();
    return cleanRules(JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text));
  } catch {
    const e = new Error("bad JSON from Gemini");
    e.retryable = true;
    throw e;
  }
}

// Main model (up to 3 tries), then the fallback model (up to 3 tries), all inside MAX_TOTAL_MS.
async function parseWithGemini(prompt) {
  const deadline = Date.now() + MAX_TOTAL_MS;
  const models = MODEL === FALLBACK_MODEL ? [MODEL] : [MODEL, FALLBACK_MODEL];

  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const timeLeft = deadline - Date.now();
      if (timeLeft < 1500) throw new Error("ran out of time");
      try {
        return await callGeminiOnce(model, prompt, Math.min(ATTEMPT_TIMEOUT_MS, timeLeft));
      } catch (err) {
        console.error(`parse-preferences: ${model} try ${attempt + 1} failed: ${err.message}`);
        if (!err.retryable) break; // e.g. 400/404: retrying the same model won't help, go to the fallback
        if (attempt < RETRY_DELAYS_MS.length) await sleep(Math.min(RETRY_DELAYS_MS[attempt], Math.max(0, deadline - Date.now() - 1500)));
      }
    }
  }
  throw new Error("all models failed");
}

// Successful results are kept in memory by the exact input, so repeating a request (e.g. in a demo) is instant.
const preferenceCache = new Map();
const CACHE_LIMIT = 200;

// Body: { notes, days, times, busyTimes, numCourses, numOnline }
// Reply: { hardRules, softRules, summary }  (plus error: "AI unavailable" if Gemini failed)
app.post("/api/parse-preferences", async (req, res) => {
  const body = req.body || {};
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!notes) {
    return res.json(EMPTY_RULES);
  }

  const input = { ...body, notes };
  const cacheKey = JSON.stringify([input.notes, input.days, input.times, input.busyTimes, input.numCourses, input.numOnline]);
  if (preferenceCache.has(cacheKey)) {
    return res.json(preferenceCache.get(cacheKey));
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("parse-preferences: GEMINI_API_KEY is not set");
    return res.json({ ...EMPTY_RULES, error: "AI unavailable" });
  }

  try {
    const rules = await parseWithGemini(buildPreferencePrompt(input));
    if (preferenceCache.size >= CACHE_LIMIT) preferenceCache.delete(preferenceCache.keys().next().value); // drop the oldest
    preferenceCache.set(cacheKey, rules);
    res.json(rules);
  } catch (err) {
    console.error("parse-preferences gave up:", err.message); // short message only, never the key; errors are not cached
    res.json({ ...EMPTY_RULES, error: "AI unavailable" });
  }
});

app.listen(PORT, () => {
  console.log(`OwlPilot server running on http://localhost:${PORT}`);
});
