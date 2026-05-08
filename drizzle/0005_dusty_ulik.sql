CREATE INDEX "logs_service_timestamp_idx" ON "logs" USING btree ("service","timestamp");--> statement-breakpoint
CREATE INDEX "logs_level_timestamp_idx" ON "logs" USING btree ("level","timestamp");--> statement-breakpoint
CREATE INDEX "logs_service_level_timestamp_idx" ON "logs" USING btree ("service","level","timestamp");