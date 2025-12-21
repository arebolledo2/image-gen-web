ALTER TABLE "batches" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "parent_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "guidance" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "guidance" ADD COLUMN "parent_guidance_id" uuid;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "transparent_file_path" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "parent_subject_id" uuid;