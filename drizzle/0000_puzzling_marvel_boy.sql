CREATE TABLE "analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"risk" varchar(50) NOT NULL,
	"confidence" integer NOT NULL,
	"missing_items" text[],
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer" varchar(255) NOT NULL,
	"project" varchar(255) NOT NULL,
	"status" varchar(58),
	"estimated_value" numeric(12, 2),
	"created_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_quote_id_quote_request_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote_request"("id") ON DELETE cascade ON UPDATE no action;