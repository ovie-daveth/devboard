import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),

  level: text("level").notNull(),

  service: text("service").notNull(),

  message: text("message").notNull(),

  metadata: jsonb("metadata"),
});