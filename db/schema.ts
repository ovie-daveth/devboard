import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { email } from "zod";


export const logs = pgTable(
  "logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),

    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    level: text("level").notNull(),

    service: text("service").notNull(),

    environment: text("environment").notNull().default("development"),

    message: text("message").notNull(),

    traceId: text("trace_id"),
    spanId: text("span_id"),
    requestId: text("request_id"),

    metadata: jsonb("metadata"),
  },
  (table) => ({
    timestampIdx: index("logs_timestamp_idx").on(table.timestamp),
    receivedAtIdx: index("logs_received_at_idx").on(table.receivedAt),

    serviceIdx: index("logs_service_idx").on(table.service),
    levelIdx: index("logs_level_idx").on(table.level),
    environmentIdx: index("logs_environment_idx").on(table.environment),

    traceIdIdx: index("logs_trace_id_idx").on(table.traceId),
    spanIdIdx: index("logs_span_id_idx").on(table.spanId),
    requestIdIdx: index("logs_request_id_idx").on(table.requestId),
    
    serviceTimestampIdx: index("logs_service_timestamp_idx").on(table.service, table.timestamp),

    levelTimestampIdx: index("logs_level_timestamp_idx").on(table.level, table.timestamp),

    serviceLevelTimestampIdx: index("logs_service_level_timestamp_idx").on(table.service, table.level, table.timestamp),
  })
);

export const servicesType = pgTable("services_type", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
}, (table) => {
  return {
    nameIdx: index("name_idx").on(table.name),
  };
});

export const AuthorsType = pgTable("authors_type", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").unique().notNull(),
}, (table) => {
  return {
    nameIdx: index("name_idx").on(table.name),
    emailIdx: index("email_idx").on(table.email),
  };
});