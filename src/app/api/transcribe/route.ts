import { getCurrentUser } from "@/lib/current-user";
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  if (!await getCurrentUser(req.headers)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY", transcript: "" },
      { status: 500 }
    );
  }

  const incoming = await req.formData().catch(() => null);
  const audio = incoming?.get("audio");

  if (!(audio instanceof File) || audio.size === 0 || audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Send an audio file between 1 byte and 25 MB" }, { status: 400 });
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
