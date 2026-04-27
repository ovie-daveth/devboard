ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "service_idx" ON "logs" USING btree ("service");--> statement-breakpoint
CREATE INDEX "level_idx" ON "logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "name_idx" ON "services_type" USING btree ("name");