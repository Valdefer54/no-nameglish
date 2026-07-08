import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export async function POST(req: NextRequest) {
  const { word, sentence, category } = await req.json() as {
    word: string;
    sentence: string;
    category: string;
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { feedback: "AI feedback unavailable (missing API key)." },
      { status: 200 }
    );
  }

  const prompt = `You are a concise English tutor. The student is learning the word "${word}" (category: ${category}).
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
