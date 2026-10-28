CREATE TABLE "vocabulary" (
	"word" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"topic" text NOT NULL,
	"sentence" text NOT NULL,
	"meaning" text NOT NULL,
	"hint" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "cefr_level" text DEFAULT 'B2-C1';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_level" text DEFAULT 'beginner' NOT NULL;