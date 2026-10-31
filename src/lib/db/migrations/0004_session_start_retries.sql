ALTER TABLE "sessions" ADD COLUMN "request_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_user_request_idx" ON "sessions" USING btree ("user_id","request_id");