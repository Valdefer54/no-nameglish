import { readFileSync } from "fs";
import { createConnection } from "net";
import { Client } from "pg";

const DB = {
  host: "localhost",
  port: 5434,
  user: "nameglish",
  password: "nameglish123",
  database: "no_nameglish",
};

const WORD_LINE = /^\s+(\d+)\.\s+(.+?)\s*$/;

const SECTION_TYPES = {
  1: "general",
  2: "intensity-modifier",
  3: "precision-verb",
  4: "debate-connector",
  5: "phrasal-verb",
};

function parseWords(filePath) {
  const lines = readFileSync(filePath, "utf8").split("\n");
  const words = [];
  let currentSection = 0;

  for (const line of lines) {
    // Detect section headers
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

    const type = SECTION_TYPES[currentSection];
    if (!type) continue;

    words.push({ word, type });
  }

  return words;
}

async function seed() {
  const words = parseWords("./5000_palabras_ingles_B2-C1.txt");
  console.log(`Parsed ${words.length} words from txt.`);

  const client = new Client(DB);
  await client.connect();

  // Batch insert in chunks of 500
  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK);
    const values = chunk
      .map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2}::word_type)`)
      .join(", ");
    const params = chunk.flatMap((w) => [w.word, w.type]);

    await client.query(
      `INSERT INTO vocabulary_words (word, type) VALUES ${values}`,
      params
    );
    inserted += chunk.length;
    console.log(`  Inserted ${inserted}/${words.length}...`);
  }

  await client.end();
  console.log(`\nDone. ${inserted} words inserted into PostgreSQL.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
