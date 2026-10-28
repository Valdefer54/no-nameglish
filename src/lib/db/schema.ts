import { pgTable, text, integer, real, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth-schema";
export * from "./auth-schema";

export const cards = pgTable("cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => users.id),
  cefrLevel: text("cefr_level").default("B2-C1"),
  deckId: text("deck_id"),
  sentence: text("sentence").notNull(),
  targetChunk: text("target_chunk").notNull(),
  meaning: text("meaning").notNull(),
  hint: text("hint"),
  sourceContext: text("source_context"),
  
  // FSRS spaced repetition columns
  state: integer("state").notNull().default(0), // 0=New, 1=Learning, 2=Review, 3=Relearning
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
}, (table) => [index("cards_user_due_idx").on(table.userId, table.due)]);

export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at", { mode: "string", withTimezone: true })
    .notNull()
    .default(sql`now()`),
  completedAt: timestamp("completed_at", { mode: "string", withTimezone: true }),
  totalCards: integer("total_cards").notNull().default(0),
  worstCardIds: text("worst_card_ids"), // JSON: number[]
}, (table) => [index("sessions_user_idx").on(table.userId)]);

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
}, (table) => [index("card_reviews_session_idx").on(table.sessionId)]);

export type InsertCard = typeof cards.$inferInsert;
export type SelectCard = typeof cards.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type SelectSession = typeof sessions.$inferSelect;
export type InsertCardReview = typeof cardReviews.$inferInsert;
export type SelectCardReview = typeof cardReviews.$inferSelect;
