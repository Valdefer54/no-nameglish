ALTER TABLE "users" ADD COLUMN "beginner_level" text DEFAULT 'A1' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "graduation_pending" boolean DEFAULT false NOT NULL;