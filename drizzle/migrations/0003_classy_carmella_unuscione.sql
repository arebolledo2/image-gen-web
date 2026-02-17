CREATE TYPE "public"."audio_provider" AS ENUM('audiocraft', 'elevenlabs');--> statement-breakpoint
CREATE TABLE "audio_batch_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audio_batch_id" uuid NOT NULL,
	"prompt_text" text NOT NULL,
	"overrides" json,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_audio_batch_id" uuid,
	"description" text,
	"status" "batch_status" DEFAULT 'draft' NOT NULL,
	"provider" "audio_provider" DEFAULT 'elevenlabs' NOT NULL,
	"defaults" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audio_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audio_generation_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"file_size" integer,
	"duration" integer,
	"sample_rate" integer,
	"metadata" json,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audio_batch_id" uuid NOT NULL,
	"audio_batch_prompt_id" uuid NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"run_number" integer NOT NULL,
	"metadata" json,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "composer_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_id" uuid NOT NULL,
	"source_version" text NOT NULL,
	"edited_file_path" text NOT NULL,
	"transparent_edit_path" text,
	"user_prompt" text NOT NULL,
	"full_ai_prompt" text NOT NULL,
	"generated_name" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "flipped_file_path" text;--> statement-breakpoint
ALTER TABLE "squish_animations" ADD COLUMN "full_ai_prompt" text;--> statement-breakpoint
ALTER TABLE "styles" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;