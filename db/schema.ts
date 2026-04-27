import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  level: text("level").notNull(),
  service: text("service").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
}, (table) => {
  return {
    timestampIdx: index("timestamp_idx").on(table.timestamp),
    serviceIdx: index("service_idx").on(table.service),
    levelIdx: index("level_idx").on(table.level),
  };
});

export const servicesType = pgTable("services_type", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
}, (table) => {
  return {
    nameIdx: index("name_idx").on(table.name),
  };
});