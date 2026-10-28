-- Supports both existing single-user installations and fresh databases.
CREATE TABLE IF NOT EXISTS "card_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "card_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" integer NOT NULL,
	"card_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"response_time_ms" integer NOT NULL,
	"sentence" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE IF NOT EXISTS "cards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"deck_id" text,
	"sentence" text NOT NULL,
	"target_chunk" text NOT NULL,
	"meaning" text NOT NULL,
	"hint" text,
	"source_context" text,
	"state" integer DEFAULT 0 NOT NULL,
	"due" timestamp with time zone DEFAULT now() NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"elapsed_days" real DEFAULT 0 NOT NULL,
	"scheduled_days" real DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE IF NOT EXISTS "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"total_cards" integer DEFAULT 0 NOT NULL,
	"worst_card_ids" text
);

INSERT INTO cards (deck_id, sentence, target_chunk, meaning, state, due, stability, reps) VALUES ('general', 'This is a {{legacy}} card.', 'legacy', 'Existing owner data', 2, '2030-01-01T00:00:00Z', 42, 9);
INSERT INTO sessions (completed_at, total_cards, worst_card_ids) VALUES ('2026-10-01T12:00:00Z', 1, '[1]');
INSERT INTO card_reviews (session_id, card_id, rating, response_time_ms, sentence) VALUES (1, 1, 3, 1500, 'My existing review.');
