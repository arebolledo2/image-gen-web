CREATE TYPE "public"."animation_generator" AS ENUM('manual', 'ai');--> statement-breakpoint
CREATE TYPE "public"."animation_type" AS ENUM('bounce', 'squash_stretch');--> statement-breakpoint
CREATE TABLE "squish_animations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_id" uuid NOT NULL,
	"spritesheet_path" text NOT NULL,
	"frame_count" integer NOT NULL,
	"intensity" integer NOT NULL,
	"animation_type" "animation_type" DEFAULT 'bounce' NOT NULL,
	"generated_by" "animation_generator" DEFAULT 'manual' NOT NULL,
	"ai_prompt" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "is_transparent" boolean DEFAULT true NOT NULL;