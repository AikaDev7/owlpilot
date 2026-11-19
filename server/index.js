// OwlPilot server: the app talks to this, and only this server talks to Gemini.
// That way GEMINI_API_KEY never ends up inside the app.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

app.listen(PORT, () => {
  console.log(`OwlPilot server running on http://localhost:${PORT}`);
});
