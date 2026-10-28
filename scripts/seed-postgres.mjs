import { readFileSync } from "fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Define the cards table matching Drizzle schema
export const cards = pgTable("cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  cefrLevel: text("cefr_level"),
  deckId: text("deck_id"),
  sentence: text("sentence").notNull(),
  targetChunk: text("target_chunk").notNull(),
  meaning: text("meaning").notNull(),
  hint: text("hint"),
  sourceContext: text("source_context"),
  state: integer("state").notNull().default(0),
  due: timestamp("due", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  elapsedDays: real("elapsed_days").notNull().default(0),
  scheduledDays: real("scheduled_days").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  learningSteps: integer("learning_steps").notNull().default(0),
  lastReview: timestamp("last_review", { mode: "string", withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

const DB_CONNECTION = process.env.POSTGRES_URL;
if (!DB_CONNECTION || !process.env.OWNER_USERNAME) {
  throw new Error("Set POSTGRES_URL and OWNER_USERNAME; run db:setup-users first.");
}

const WORD_LINE = /^\s+(\d+)\.\s+(.+?)\s*$/;

const SECTION_TYPES = {
  1: "general",
  2: "intensity-modifiers",
  3: "precision-verbs",
  4: "debate-connectors",
  5: "phrasal-verbs",
};

// Specific mock sentence transformations for key vocabulary entries
const SPECIFIC_TRANSFORMATIONS = {
  spike: {
    sentence: "The system crashed due to a sudden {{spike}} in traffic.",
    meaning: "A sharp increase.",
    hint: "Think of an abrupt peak or surge in numbers.",
  },
  abandon: {
    sentence: "The team had to {{abandon}} the legacy codebase after critical vulnerabilities were found.",
    meaning: "To cease supporting or give up completely.",
    hint: "To leave behind or discontinue.",
  },
  ability: {
    sentence: "Her {{ability}} to decompose complex problems made her an invaluable lead engineer.",
    meaning: "The physical or mental power to do something.",
    hint: "Capacity, skill, or talent.",
  },
  accelerate: {
    sentence: "They adopted modern CI/CD tooling to {{accelerate}} the deployment pipeline.",
    meaning: "To increase speed or progress more rapidly.",
    hint: "Speed up or quicken.",
  },
  furthermore: {
    sentence: "The benchmark results were conclusive; {{furthermore}}, memory usage dropped by half.",
    meaning: "In addition; moreover.",
    hint: "Connector used to introduce an additional corroborating point.",
  },
  drastically: {
    sentence: "Optimizing the query execution plan {{drastically}} reduced database response times.",
    meaning: "In an extreme, severe, or substantial manner.",
    hint: "Significantly or intensely.",
  },
  "break down": {
    sentence: "We need to {{break down}} this monolithic architecture into modular microservices.",
    meaning: "To divide into smaller parts for easier analysis or processing.",
    hint: "Separate into constituent components.",
  },
};

/**
 * Generate a cloze deletion record from a word and category
 */
function createClozeCard(word, category) {
  const normalizedWord = word.trim().toLowerCase();

  if (SPECIFIC_TRANSFORMATIONS[normalizedWord]) {
    const item = SPECIFIC_TRANSFORMATIONS[normalizedWord];
    return {
      sentence: item.sentence,
      targetChunk: word,
      meaning: item.meaning,
      hint: item.hint,
      sourceContext: `Oxford 5000 / ${category}`,
      deckId: category,
    };
  }

  // Category-tailored templates for general transformation
  switch (category) {
    case "debate-connectors":
      return {
        sentence: `The hypothesis appeared promising; {{${word}}}, additional empirical trials revealed notable edge cases.`,
        targetChunk: word,
        meaning: `Discourse connector expressing logical transition (${word}).`,
        hint: `Used to connect arguments or articulate reasoning.`,
        sourceContext: "Academic Debate & Argumentation",
        deckId: category,
      };

    case "precision-verbs":
      return {
        sentence: `Senior engineers decided to {{${word}}} the system architecture to prevent future bottlenecks.`,
        targetChunk: word,
        meaning: `To perform the action of '${word}' with precision and intent.`,
        hint: `Action verb: to ${word}.`,
        sourceContext: "Technical & Professional Discourse",
        deckId: category,
      };

    case "intensity-modifiers":
      return {
        sentence: `The overall system efficiency improved {{${word}}} following the runtime optimizations.`,
        targetChunk: word,
        meaning: `Modifying intensity or degree in a ${word} manner.`,
        hint: `Modifier indicating degree (${word}).`,
        sourceContext: "Advanced English Lexicon",
        deckId: category,
      };

    case "phrasal-verbs":
      return {
        sentence: `During the incident review, the team worked together to {{${word}}} and mitigate further risk.`,
        targetChunk: word,
        meaning: `Idiomatic phrasal expression: ${word}.`,
        hint: `Multi-word verb phrase (${word}).`,
        sourceContext: "Native Idiomatic Expressions",
        deckId: category,
      };

    case "general":
    default:
      return {
        sentence: `The team analyzed how the concept of {{${word}}} influenced the final outcome of the project.`,
        targetChunk: word,
        meaning: `Definition and usage of the term '${word}'.`,
        hint: `Core vocabulary term: ${word}.`,
        sourceContext: "Oxford 5000 Corpus",
        deckId: category,
      };
  }
}

function parseWords(filePath) {
  const lines = readFileSync(filePath, "utf8").split("\n");
  const entries = [];
  let currentSection = 0;

  for (const line of lines) {
    const sectionMatch = line.match(/^SECCION\s+(\d+):/);
    if (sectionMatch) {
      currentSection = parseInt(sectionMatch[1], 10);
      continue;
    }

    if (currentSection === 0) continue;

    const wordMatch = line.match(WORD_LINE);
    if (!wordMatch) continue;

    const word = wordMatch[2].trim();
    if (!word) continue;

    const category = SECTION_TYPES[currentSection];
    if (!category) continue;

    entries.push({ word, category });
  }

  return entries;
}

async function seed() {
  console.log("Reading and parsing word list...");
  const rawWords = parseWords("./5000_palabras_ingles_B2-C1.txt");
  console.log(`Parsed ${rawWords.length} entries from text file.`);

  // Transform words into Cloze Sentence Mining records
  const clozeCards = rawWords.map(({ word, category }) =>
    createClozeCard(word, category)
  );

  console.log(`Generated ${clozeCards.length} cloze deletion cards.`);

  const client = postgres(DB_CONNECTION, { max: 1 });
  const db = drizzle(client);
  const [owner] = await client`SELECT id FROM users WHERE username = ${process.env.OWNER_USERNAME.trim().toLowerCase()} AND role = 'admin'`;
  if (!owner) throw new Error("Owner not found. Run db:setup-users first.");
  const existing = await client`SELECT target_chunk FROM cards WHERE user_id = ${owner.id}`;
  const seen = new Set(existing.map((card) => card.target_chunk));
  const missingCards = clozeCards.filter((card) => {
    if (seen.has(card.targetChunk)) return false;
    seen.add(card.targetChunk);
    return true;
  });

  console.log("Connecting to PostgreSQL and seeding cards via Drizzle ORM...");

  const CHUNK_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < missingCards.length; i += CHUNK_SIZE) {
    const chunk = missingCards.slice(i, i + CHUNK_SIZE);
    
    // Batch insert using Drizzle ORM
    await db.insert(cards).values(
      chunk.map((item) => ({
        userId: owner.id,
        cefrLevel: "B2-C1",
        sentence: item.sentence,
        targetChunk: item.targetChunk,
        meaning: item.meaning,
        hint: item.hint,
        sourceContext: item.sourceContext,
        deckId: item.deckId,
        state: 0,
        due: new Date().toISOString(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        learningSteps: 0,
        isActive: true,
      }))
    );

    inserted += chunk.length;
    console.log(`  Inserted ${inserted}/${missingCards.length} cards...`);
  }

  await client.end();
  console.log(`\nDone! Successfully seeded ${inserted} sentence mining cards into PostgreSQL.`);
}

seed().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
