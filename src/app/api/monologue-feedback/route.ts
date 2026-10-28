import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.words) || body.words.length > 25 ||
      !body.words.every((word: unknown) => typeof word === "string" && word.length <= 200) ||
      typeof body.transcript !== "string" || body.transcript.length > 12000) {
    return NextResponse.json({ error: "Invalid monologue request" }, { status: 400 });
  }
  const { words, transcript } = body as { words: string[]; transcript: string };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ feedback: "AI feedback unavailable (missing API key)." });
  }

  const wordList = words.map((w) => `"${w}"`).join(", ");

  const prompt = `${user.studyLevel === "beginner" ? "Respond in simple Spanish and give gentle A1-B1 level advice." : "Respond in English at B2-C1 level."}
You are a concise English tutor evaluating a student's spoken monologue.
The student was asked to use these words naturally: ${wordList}.

Their transcribed speech:
"${transcript}"

Give feedback in 3 short lines:
1. Which words they used correctly and naturally.
2. Which words were missing or misused (if any).
3. One specific tip to improve fluency or naturalness.
Be encouraging. Max 60 words total.`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ feedback: "Could not get feedback right now." });
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const feedback = data.choices[0]?.message?.content?.trim() ?? "No feedback returned.";
  return NextResponse.json({ feedback });
}
