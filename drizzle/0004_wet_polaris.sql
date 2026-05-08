DROP INDEX "timestamp_idx";--> statement-breakpoint
DROP INDEX "service_idx";--> statement-breakpoint
DROP INDEX "level_idx";--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "received_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "environment" text DEFAULT 'development' NOT NULL;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "trace_id" text;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "span_id" text;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "request_id" text;--> statement-breakpoint
CREATE INDEX "logs_timestamp_idx" ON "logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "logs_received_at_idx" ON "logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "logs_service_idx" ON "logs" USING btree ("service");--> statement-breakpoint
CREATE INDEX "logs_level_idx" ON "logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "logs_environment_idx" ON "logs" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "logs_trace_id_idx" ON "logs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "logs_span_id_idx" ON "logs" USING btree ("span_id");--> statement-breakpoint
CREATE INDEX "logs_request_id_idx" ON "logs" USING btree ("request_id");