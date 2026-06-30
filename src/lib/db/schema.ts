import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const vocabularyWords = sqliteTable("vocabulary_words", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  word: text("word").notNull(),
  definition: text("definition").notNull(),
  exampleSentence: text("example_sentence").notNull(),
  translationHint: text("translation_hint"),
  category: text("category", {
    enum: [
      "debate-connectors",
      "precision-verbs",
      "intensity-modifiers",
      "phrasal-verbs",
      "general",
    ],
  }).notNull(),
  addedAt: text("added_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  source: text("source", { enum: ["seed", "expansion"] })
    .notNull()
    .default("seed"),
});

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wordId: integer("word_id")
    .notNull()
    .references(() => vocabularyWords.id),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  elapsedDays: real("elapsed_days").notNull().default(0),
  scheduledDays: real("scheduled_days").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  learningSteps: integer("learning_steps").notNull().default(0),
  // 0=New, 1=Learning, 2=Review, 3=Relearning
  state: integer("state").notNull().default(0),
  lastReview: text("last_review"),
  nextReview: text("next_review")
    .notNull()
    .default(sql`(datetime('now'))`),
  category: text("category", {
    enum: [
      "debate-connectors",
      "precision-verbs",
      "intensity-modifiers",
      "phrasal-verbs",
      "general",
    ],
  }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  completedAt: text("completed_at"),
  totalCards: integer("total_cards").notNull().default(0),
  worstCardIds: text("worst_card_ids"), // JSON: number[]
});

export const cardReviews = sqliteTable("card_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id),
  rating: integer("rating").notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  sentence: text("sentence").notNull(),
  reviewedAt: text("reviewed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type InsertVocabularyWord = typeof vocabularyWords.$inferInsert;
export type SelectVocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;
export type SelectCard = typeof cards.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;
export type InsertCardReview = typeof cardReviews.$inferInsert;
export type SelectCardReview = typeof cardReviews.$inferSelect;
