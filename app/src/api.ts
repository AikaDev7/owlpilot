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
