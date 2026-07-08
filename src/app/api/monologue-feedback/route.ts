import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: NextRequest) {
  const { words, transcript } = await req.json() as {
    words: string[];
    transcript: string;
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ feedback: "AI feedback unavailable (missing API key)." });
  }

  const wordList = words.map((w) => `"${w}"`).join(", ");

  const prompt = `You are a concise English tutor evaluating a student's spoken monologue.
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
