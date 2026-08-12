import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vocabularyWords = pgTable("vocabulary_words", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
  addedAt: timestamp("added_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
  source: text("source", { enum: ["seed", "expansion"] })
    .notNull()
    .default("seed"),
});

export const cards = pgTable("cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
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
  lastReview: timestamp("last_review", { mode: "string", withTimezone: true }),
  nextReview: timestamp("next_review", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
  category: text("category", {
    enum: [
      "debate-connectors",
      "precision-verbs",
      "intensity-modifiers",
      "phrasal-verbs",
      "general",
    ],
  }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  startedAt: timestamp("started_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
  completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
  totalCards: integer("total_cards").notNull().default(0),
  worstCardIds: text("worst_card_ids"), // JSON: number[]
});

export const cardReviews = pgTable("card_reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id),
  rating: integer("rating").notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  sentence: text("sentence").notNull(),
  reviewedAt: timestamp("reviewed_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type InsertVocabularyWord = typeof vocabularyWords.$inferInsert;
export type SelectVocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;
export type SelectCard = typeof cards.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;
export type InsertCardReview = typeof cardReviews.$inferInsert;
export type SelectCardReview = typeof cardReviews.$inferSelect;
