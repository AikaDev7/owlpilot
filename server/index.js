// OwlPilot server: the app talks to this, and only this server talks to Gemini.
// That way GEMINI_API_KEY never ends up inside the app.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // room for one small base64 photo (read-sign)

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

// One Gemini call. Returns clean(parsed JSON), or throws an Error with `retryable` set.
async function callGeminiOnce(model, prompt, timeoutMs, schema, clean, image = null) {
  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: image ? [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: prompt }] : [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
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
    return clean(JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text));
  } catch {
    const e = new Error("bad JSON from Gemini");
    e.retryable = true;
    throw e;
  }
}

// Main model (up to 3 tries), then the fallback model (up to 3 tries), all inside MAX_TOTAL_MS.
async function parseWithGemini(prompt, schema = PREFERENCES_SCHEMA, clean = cleanRules, label = "parse-preferences", image = null) {
  const deadline = Date.now() + MAX_TOTAL_MS;
  const models = MODEL === FALLBACK_MODEL ? [MODEL] : [MODEL, FALLBACK_MODEL];

  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const timeLeft = deadline - Date.now();
      if (timeLeft < 1500) throw new Error("ran out of time");
      try {
        return await callGeminiOnce(model, prompt, Math.min(ATTEMPT_TIMEOUT_MS, timeLeft), schema, clean, image);
      } catch (err) {
        console.error(`${label}: ${model} try ${attempt + 1} failed: ${err.message}`);
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

// ---------- Schedule explanation ----------
const NO_REVIEWS = "Not enough reviews yet";
const EXPLAIN_SCHEMA = {
  type: "OBJECT",
  properties: {
    why: { type: "STRING" },
    professors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, summary: { type: "STRING" } },
        required: ["name", "summary"],
      },
    },
  },
  required: ["why", "professors"],
};

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

// Trim the app's input to a safe size. Reviews are keyed by professor name, max 5 short ones each.
function cleanExplainInput(body) {
  const classInfo = (c) => ({
    course: str(c?.course, 20),
    title: str(c?.title, 80),
    professor: str(c?.professor, 80),
    rating: typeof c?.rating === "number" ? c.rating : null,
    difficulty: typeof c?.difficulty === "number" ? c.difficulty : null,
    wouldTakeAgain: typeof c?.wouldTakeAgain === "number" ? c.wouldTakeAgain : null,
    meets: list(c?.meets, 4).map((m) => str(m, 60)),
    tags: list(c?.tags, 6).map((t) => str(t, 30)),
  });
  const reviews = {};
  for (const [name, rs] of Object.entries(body.reviews && typeof body.reviews === "object" ? body.reviews : {})) {
    reviews[str(name, 80)] = list(rs, 5)
      .filter((r) => r && typeof r.text === "string" && r.text.trim())
      .map((r) => ({ course: str(r.course, 20), quality: r.quality ?? null, difficulty: r.difficulty ?? null, text: str(r.text, 350) }));
  }
  return {
    preferences: list(body.preferences, 8).map((p) => str(p, 120)),
    strategy: str(body.strategy, 40),
    badges: list(body.badges, 4).map((b) => str(b, 60)),
    classes: list(body.classes, 8).map(classInfo),
    alternatives: list(body.alternatives, 8).map((a) => ({ ...classInfo(a), replaces: str(a?.replaces, 80), reason: str(a?.reason, 80) })),
    reviews,
  };
}

function buildExplainPrompt(input) {
  return `You explain a college class schedule to the student who will take it. Use ONLY the facts below.

Student preferences: ${JSON.stringify(input.preferences)}
Schedule type: "${input.strategy || "custom"}" ${input.badges.length ? `(also: ${JSON.stringify(input.badges)})` : ""}

Classes in this schedule (rating and difficulty out of 5, wouldTakeAgain in %, tags: suggested = added by us, waitlist = section is full, outsidePreferredTime, noRatings):
${JSON.stringify(input.classes)}

"Upgrade your professor" alternatives (a different section of the same course with a higher-rated professor, "replaces" is the professor currently in the schedule, "reason" is why it was not picked):
${JSON.stringify(input.alternatives)}

Student reviews per professor (the ONLY source for what students say):
${JSON.stringify(input.reviews)}

Write:
- why: 2-3 sentences on why this schedule fits the student, with concrete trade-offs. Name real professors, courses, ratings, days or times from the data. Example: "Dinadayalane is rated higher for CS 4306, but her open section overlaps with AI 4732, so you could join the waitlist for her other section." Never invent facts.
- professors: one entry for EVERY professor in the classes AND in the alternatives (use the exact name given). summary = 1-2 balanced sentences on what students say (teaching style, workload, exams, grading), based ONLY on that professor's reviews above. Mention both positives and negatives fairly, in a calm tone, no insults and no quoting harsh wording. If a professor has no reviews, the summary must be exactly "${NO_REVIEWS}".`;
}

// Keep a summary for every expected professor; no reviews always means the fixed text.
function cleanExplanation(raw, input) {
  const names = new Set();
  [...input.classes, ...input.alternatives].forEach((c) => c.professor && names.add(c.professor));
  const given = new Map();
  for (const p of list(raw?.professors, 30)) {
    if (p && typeof p.name === "string" && typeof p.summary === "string" && p.summary.trim()) given.set(p.name.trim(), p.summary.trim());
  }
  const professors = [...names].map((name) => ({
    name,
    summary: (input.reviews[name] || []).length === 0 ? NO_REVIEWS : given.get(name) || NO_REVIEWS,
  }));
  const why = typeof raw?.why === "string" ? raw.why.trim() : "";
  if (!why) throw Object.assign(new Error("empty explanation"), { retryable: true });
  return { why, professors };
}

const explainCache = new Map();

// Body: { preferences, strategy, badges, classes, alternatives, reviews }
// Reply: { why, professors: [{ name, summary }] }  (or { why: "", professors: [], error: "AI unavailable" })
app.post("/api/explain-schedule", async (req, res) => {
  const input = cleanExplainInput(req.body || {});
  const failure = { why: "", professors: [], error: "AI unavailable" };
  if (input.classes.length === 0) return res.json(failure);

  const cacheKey = JSON.stringify(input);
  if (explainCache.has(cacheKey)) return res.json(explainCache.get(cacheKey));

  if (!process.env.GEMINI_API_KEY) {
    console.error("explain-schedule: GEMINI_API_KEY is not set");
    return res.json(failure);
  }

  try {
    const result = await parseWithGemini(buildExplainPrompt(input), EXPLAIN_SCHEMA, (raw) => cleanExplanation(raw, input), "explain-schedule");
    if (explainCache.size >= CACHE_LIMIT) explainCache.delete(explainCache.keys().next().value);
    explainCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error("explain-schedule gave up:", err.message);
    res.json(failure);
  }
});

// ---------- Read a room sign from a photo ----------
const SIGN_SCHEMA = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING" }, // "room", "landmark" or "none"
    room: { type: "STRING" }, // "" when none
    landmark: { type: "STRING" }, // "" when none
    confidence: { type: "NUMBER" },
  },
  required: ["kind", "room", "landmark", "confidence"],
};

const SIGN_PROMPT = `Look at the photo. It was taken inside a university building (building Q). First read any text you can see.
- If you can read a room number (for example on a door sign or a plaque, even on a plain background), answer kind "room" and put it in "room". Normalize formats like "Q 207", "207" and "Q207" to "Q-207" (always assume building Q).
- Else if you clearly see stairs, an elevator, an entrance, or a restroom/exit sign, answer kind "landmark" and set "landmark" to one of: stairs, elevator, entrance, restroom, exit.
- Otherwise answer kind "none".
Do not invent a room number you cannot read. "confidence" is 0 to 1. Use an empty string for fields that do not apply. "kind" is exactly one of: room, landmark, none.`;

// Turns Gemini's reply into a safe { kind, room, landmark, confidence }
function cleanSign(raw) {
  const landmarks = ["stairs", "elevator", "entrance", "restroom", "exit"];
  let room = null;
  if (typeof raw.room === "string") {
    const m = raw.room.toUpperCase().match(/^\s*Q?[\s-]*(\d{3})\s*$/);
    if (m) room = `Q-${m[1]}`;
  }
  const landmark = landmarks.includes(raw.landmark) ? raw.landmark : null;
  const confidence = typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0;
  if (raw.kind === "room" && room) return { kind: "room", room, landmark: null, confidence };
  if (raw.kind === "landmark" && landmark) return { kind: "landmark", room: null, landmark, confidence };
  return { kind: "none", room: null, landmark: null, confidence: 0 };
}

// Body: { image: base64 JPEG }   Reply: { kind, room, landmark, confidence }  (or { kind: "none", error: "AI unavailable" })
// Not cached and the image is never logged.
app.post("/api/read-sign", async (req, res) => {
  const failure = { kind: "none", room: null, landmark: null, confidence: 0, error: "AI unavailable" };
  const image = typeof req.body?.image === "string" ? req.body.image.replace(/^data:image\/\w+;base64,/, "") : "";
  if (!image) return res.json(failure);
  if (!process.env.GEMINI_API_KEY) {
    console.error("read-sign: GEMINI_API_KEY is not set");
    return res.json(failure);
  }
  try {
    res.json(await parseWithGemini(SIGN_PROMPT, SIGN_SCHEMA, cleanSign, "read-sign", image));
  } catch (err) {
    console.error("read-sign gave up:", err.message);
    res.json(failure);
  }
});

app.listen(PORT, () => {
  console.log(`OwlPilot server running on http://localhost:${PORT}`);
});
