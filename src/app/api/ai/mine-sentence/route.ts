import { NextRequest, NextResponse } from "next/server";
import type { VocabCategory } from "@/types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const VALID_CATEGORIES: VocabCategory[] = [
  "debate-connectors",
  "precision-verbs",
  "intensity-modifiers",
  "phrasal-verbs",
  "general",
];

interface GeneratedClozeResponse {
  sentence: string;
  targetChunk: string;
  meaning: string;
  hint: string;
  category: VocabCategory;
}

export async function POST(req: NextRequest) {
  try {
    const { input } = (await req.json()) as { input: string };

    if (!input || !input.trim()) {
      return NextResponse.json(
        { error: "Please provide a word, phrase, or sentence." },
        { status: 400 }
      );
    }

    const trimmedInput = input.trim();
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      // Fallback heuristic if API key is not configured
      return NextResponse.json(generateFallback(trimmedInput));
    }

    const systemPrompt = `You are an expert English linguist and ESL curriculum designer (B2-C1 CEFR level).
The user will provide either a word, a phrasal verb, an expression, or a full sentence.
Your task is to produce a high-quality Sentence Mining / Cloze Deletion record.

Instructions:
1. Identify or extract the target vocabulary item ("targetChunk").
2. Create or adapt a natural, professional, high-yield sentence (CEFR B2-C1) where the target vocabulary item is enclosed in double curly brackets: {{targetChunk}}.
3. Provide a clear, concise English definition / meaning for the targetChunk (max 20 words).
4. Provide a brief contextual hint (max 10 words).
5. Determine the most appropriate category from EXACTLY these 5 options:
   - "debate-connectors" (e.g. however, furthermore, nevertheless, in contrast, consequently, albeit, insofar as)
   - "precision-verbs" (e.g. elucidate, substantiate, delineate, articulate, undermine, extrapolate, scrutinize)
   - "intensity-modifiers" (e.g. drastically, profoundly, markedly, substantially, overwhelmingly, acutely)
   - "phrasal-verbs" (e.g. break down, look into, carry out, bring up, fall back on, turn down, point out)
   - "general" (e.g. comprehensive, nuanced, arbitrary, pervasive, pragmatic, inevitable)

Output MUST be a single raw valid JSON object with NO markdown formatting, NO backticks, NO extra text:
{
  "sentence": "The company decided to {{turn down}} the acquisition offer due to regulatory scrutiny.",
  "targetChunk": "turn down",
  "meaning": "To refuse or decline an offer, request, or proposal.",
  "hint": "To decline or reject.",
  "category": "phrasal-verbs"
}`;

    const userPrompt = `Input: "${trimmedInput}"`;

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.warn("DeepSeek API error, using fallback:", await res.text());
      return NextResponse.json(generateFallback(trimmedInput));
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(generateFallback(trimmedInput));
    }

    // Clean potential markdown blocks if present
    const cleaned = content.replace(/```json\s*|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as GeneratedClozeResponse;

    // Validate category
    let category: VocabCategory = "general";
    if (VALID_CATEGORIES.includes(parsed.category)) {
      category = parsed.category;
    } else {
      category = guessCategory(parsed.targetChunk || trimmedInput);
    }

    // Ensure sentence has {{targetChunk}}
    let sentence = parsed.sentence || "";
    const targetChunk = parsed.targetChunk || trimmedInput;
    if (!sentence.includes("{{") || !sentence.includes("}}")) {
      if (sentence.includes(targetChunk)) {
        sentence = sentence.replace(targetChunk, `{{${targetChunk}}}`);
      } else {
        sentence = `The team learned how to apply {{${targetChunk}}} in their daily practice.`;
      }
    }

    return NextResponse.json({
      sentence,
      targetChunk,
      meaning: parsed.meaning || `Meaning and usage of '${targetChunk}'.`,
      hint: parsed.hint || `Contextual usage of '${targetChunk}'.`,
      category,
      sourceContext: "AI Sentence Mining",
    });
  } catch (error) {
    console.error("Error in mine-sentence API:", error);
    return NextResponse.json(generateFallback(""));
  }
}

function guessCategory(word: string): VocabCategory {
  const lower = word.toLowerCase().trim();
  if (
    lower.includes(" ") &&
    (lower.startsWith("turn ") ||
      lower.startsWith("break ") ||
      lower.startsWith("look ") ||
      lower.startsWith("carry ") ||
      lower.startsWith("bring ") ||
      lower.startsWith("point ") ||
      lower.startsWith("give ") ||
      lower.startsWith("put ") ||
      lower.startsWith("set "))
  ) {
    return "phrasal-verbs";
  }
  if (
    lower.endsWith("ly") &&
    [
      "drastically",
      "profoundly",
      "markedly",
      "substantially",
      "acutely",
      "markedly",
    ].includes(lower)
  ) {
    return "intensity-modifiers";
  }
  if (
    [
      "however",
      "furthermore",
      "moreover",
      "nevertheless",
      "consequently",
      "nonetheless",
      "therefore",
      "in contrast",
      "insofar as",
    ].includes(lower)
  ) {
    return "debate-connectors";
  }
  return "general";
}

function generateFallback(input: string): GeneratedClozeResponse & { sourceContext: string } {
  const word = input || "adapt";
  const category = guessCategory(word);

  return {
    sentence: `In modern development, it is critical to {{${word}}} effectively to emerging challenges.`,
    targetChunk: word,
    meaning: `The action or property associated with '${word}'.`,
    hint: `Key vocabulary: ${word}.`,
    category,
    sourceContext: "Sentence Mining (Heuristic)",
  };
}
