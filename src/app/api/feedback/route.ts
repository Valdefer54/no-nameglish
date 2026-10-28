import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req.headers);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || ![body.word, body.sentence, body.category].every((value) => typeof value === "string") ||
      body.word.length > 200 || body.sentence.length > 5000 || body.category.length > 100) {
    return NextResponse.json({ error: "Invalid feedback request" }, { status: 400 });
  }
  const { word, sentence, category } = body as { word: string; sentence: string; category: string };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { feedback: "AI feedback unavailable (missing API key)." },
      { status: 200 }
    );
  }

  const prompt = `${user.studyLevel === "beginner" ? "Give feedback in simple Spanish for an A1 learner progressing toward B1. Focus on basic usage." : "Give feedback in English for a B2-C1 learner."}
You are a concise English tutor. The student is learning the word "${word}" (category: ${category}).
They wrote this sentence: "${sentence}"
Give ONE short sentence of feedback (max 30 words) on how natural and accurate the usage is. Be specific and encouraging.`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 80,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { feedback: "Could not get feedback right now. Try again later." },
      { status: 200 }
    );
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const feedback = data.choices[0]?.message?.content?.trim() ?? "No feedback returned.";

  return NextResponse.json({ feedback });
}
