import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY", transcript: "" },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const audio = incoming.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ error: "No audio file received" }, { status: 400 });
  }

  // Preserve the original MIME so Groq picks the right decoder
  const ext = audio.type.includes("mp4") ? "m4a"
    : audio.type.includes("ogg")         ? "ogg"
    : "webm";

  const groqForm = new FormData();
  groqForm.append("file", audio, `recording.${ext}`);
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "en");
  groqForm.append("response_format", "json");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Groq error:", detail);
    return NextResponse.json({ error: "Transcription failed", detail }, { status: 502 });
  }

  const data = await res.json() as { text: string };
  return NextResponse.json({ transcript: data.text });
}
