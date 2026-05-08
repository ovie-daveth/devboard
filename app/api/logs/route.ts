import { NextRequest, NextResponse } from "next/server";

// Drizzle database instance
import { db } from "@/db";

// Drizzle schema
import { logs } from "@/db/schema";

// Drizzle SQL helpers
import {
  and,
  desc,
  eq,
  gte,
  lte,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

// Zod validation schema
import { createLogSchema } from "@/lib/validations/log";



// ---------------------------------------------
// Allowed log levels
// Prevents invalid values polluting the database
// ---------------------------------------------
const VALID_LOG_LEVELS = new Set([
  "debug",
  "info",
  "warn",
  "error",
]);



// ---------------------------------------------
// Allowed deployment environments
// ---------------------------------------------
const VALID_ENVIRONMENTS = new Set([
  "development",
  "staging",
  "production",
]);



// ---------------------------------------------
// Default pagination size
// ---------------------------------------------
const DEFAULT_LIMIT = 50;



// ---------------------------------------------
// Absolute max limit
// Prevents abuse like ?limit=1000000
// ---------------------------------------------
const MAX_LIMIT = 100;



// ---------------------------------------------
// Safely parse pagination numbers
// ---------------------------------------------
function parseLimit(value: string | null, fallback: number) {
  if (!value) return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}



// ---------------------------------------------
// Safely parse dates from query params
// Returns:
// - null if missing
// - undefined if invalid
// - Date if valid
// ---------------------------------------------
function parseDate(value: string | null): Date | null | undefined {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}



// =============================================
// POST /api/logs
// Log ingestion endpoint
// =============================================
export async function POST(req: NextRequest) {
  try {

    // -----------------------------------------
    // Parse request body
    // -----------------------------------------
    const body = await req.json();



    // -----------------------------------------
    // Validate payload with Zod
    // -----------------------------------------
    const parsed = createLogSchema.safeParse(body);



    // -----------------------------------------
    // Reject invalid payloads
    // -----------------------------------------
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid log payload",

          // Return structured validation errors
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }



    // -----------------------------------------
    // Extract validated data
    // -----------------------------------------
    const log = parsed.data;



    // -----------------------------------------
    // Insert log into database
    //
    // IMPORTANT:
    // receivedAt is NOT user-controlled.
    // Postgres generates it automatically.
    // -----------------------------------------
    await db.insert(logs).values({
      level: log.level,
      service: log.service,
      message: log.message,

      // Event timestamp
      // If client didn't provide one,
      // fallback to current time
      timestamp: log.timestamp ?? new Date(),

      environment: log.environment,

      traceId: log.traceId,
      spanId: log.spanId,
      requestId: log.requestId,

      metadata: log.metadata,
    });



    // -----------------------------------------
    // Success response
    // -----------------------------------------
    return NextResponse.json(
      {
        success: true,
      },
      { status: 201 }
    );

  } catch (err) {

    // -----------------------------------------
    // Internal logging
    // -----------------------------------------
    console.error("LOG_INGEST_ERROR:", err);



    // -----------------------------------------
    // Generic server error
    // Never leak internal details to client
    // -----------------------------------------
    return NextResponse.json(
      {
        error: "Failed to ingest log",
      },
      { status: 500 }
    );
  }
}



// =============================================
// GET /api/logs
// Query + filter logs
// Uses CURSOR pagination
// =============================================
export async function GET(req: NextRequest) {
  try {

    // -----------------------------------------
    // Parse URL search params
    // -----------------------------------------
    const { searchParams } = new URL(req.url);



    // -----------------------------------------
    // Filtering params
    // -----------------------------------------
    const service = searchParams.get("service");
    const level = searchParams.get("level");
    const environment = searchParams.get("environment");

    const traceId = searchParams.get("traceId");
    const requestId = searchParams.get("requestId");

    const from = searchParams.get("from");
    const to = searchParams.get("to");



    // -----------------------------------------
    // Cursor pagination
    //
    // Cursor format:
    // timestamp|id
    //
    // Example:
    // 2026-01-01T10:00:00Z|uuid
    // -----------------------------------------
    const cursor = searchParams.get("cursor");



    // -----------------------------------------
    // Parse limit safely
    // -----------------------------------------
    const requestedLimit = parseLimit(
      searchParams.get("limit"),
      DEFAULT_LIMIT
    );



    // -----------------------------------------
    // Reject invalid limit
    // -----------------------------------------
    if (requestedLimit === null) {
      return NextResponse.json(
        {
          error: "Invalid limit",
        },
        { status: 400 }
      );
    }



    // -----------------------------------------
    // Cap limit
    // -----------------------------------------
    const limit = Math.min(requestedLimit, MAX_LIMIT);



    // -----------------------------------------
    // Validate level
    // -----------------------------------------
    if (level && !VALID_LOG_LEVELS.has(level)) {
      return NextResponse.json(
        {
          error: "Invalid level",
        },
        { status: 400 }
      );
    }



    // -----------------------------------------
    // Validate environment
    // -----------------------------------------
    if (
      environment &&
      !VALID_ENVIRONMENTS.has(environment)
    ) {
      return NextResponse.json(
        {
          error: "Invalid environment",
        },
        { status: 400 }
      );
    }



    // -----------------------------------------
    // Parse dates
    // -----------------------------------------
    const fromDate = parseDate(from);
    const toDate = parseDate(to);



    // -----------------------------------------
    // Reject invalid dates
    // -----------------------------------------
    if (fromDate === undefined || toDate === undefined) {
      return NextResponse.json(
        {
          error: "Invalid date parameters",
        },
        { status: 400 }
      );
    }



    // -----------------------------------------
    // Dynamic SQL filters
    // -----------------------------------------
    const filters: SQL[] = [];



    // -----------------------------------------
    // Exact-match filters
    // -----------------------------------------
    if (service) {
      filters.push(eq(logs.service, service));
    }

    if (level) {
      filters.push(eq(logs.level, level));
    }

    if (environment) {
      filters.push(eq(logs.environment, environment));
    }

    if (traceId) {
      filters.push(eq(logs.traceId, traceId));
    }

    if (requestId) {
      filters.push(eq(logs.requestId, requestId));
    }



    // -----------------------------------------
    // Time-range filters
    // -----------------------------------------
    if (fromDate) {
      filters.push(gte(logs.timestamp, fromDate));
    }

    if (toDate) {
      filters.push(lte(logs.timestamp, toDate));
    }



    // -----------------------------------------
    // Cursor pagination logic
    //
    // Uses:
    // timestamp + id
    //
    // This guarantees stable ordering
    // even if timestamps are identical
    // -----------------------------------------
    if (cursor) {

      const [cursorTimestamp, cursorId] =
        cursor.split("|");



      // Validate cursor format
      if (!cursorTimestamp || !cursorId) {
        return NextResponse.json(
          {
            error: "Invalid cursor format",
          },
          { status: 400 }
        );
      }



      // Add composite cursor condition
      filters.push(
        sql`
          (
            ${logs.timestamp},
            ${logs.id}
          ) < (
            ${new Date(cursorTimestamp)},
            ${cursorId}
          )
        `
      );
    }



    // -----------------------------------------
    // Fetch one extra row
    //
    // Why?
    //
    // To determine if more pages exist
    // -----------------------------------------
    const rows = await db
      .select({

        // Explicit projection
        // Avoid SELECT *
        id: logs.id,

        timestamp: logs.timestamp,
        receivedAt: logs.receivedAt,

        level: logs.level,
        service: logs.service,
        environment: logs.environment,

        message: logs.message,

        traceId: logs.traceId,
        spanId: logs.spanId,
        requestId: logs.requestId,

        metadata: logs.metadata,
      })
      .from(logs)
      .where(
        filters.length > 0
          ? and(...filters)
          : undefined
      )

      // Stable ordering
      .orderBy(
        desc(logs.timestamp),
        desc(logs.id)
      )

      // Fetch one extra row
      .limit(limit + 1);



    // -----------------------------------------
    // Determine if another page exists
    // -----------------------------------------
    const hasMore = rows.length > limit;



    // -----------------------------------------
    // Remove extra row
    // -----------------------------------------
    const data = hasMore
      ? rows.slice(0, limit)
      : rows;



    // -----------------------------------------
    // Generate next cursor
    // -----------------------------------------
    let nextCursor: string | null = null;



    if (hasMore) {

      // Last visible row
      const last = data[data.length - 1];



      // Composite cursor
      nextCursor =
        `${last.timestamp.toISOString()}|${last.id}`;
    }



    // -----------------------------------------
    // Structured API response
    // -----------------------------------------
    return NextResponse.json({
      data,

      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });

  } catch (err) {

    // -----------------------------------------
    // Internal logging
    // -----------------------------------------
    console.error("LOG_FETCH_ERROR:", err);



    // -----------------------------------------
    // Generic server error
    // -----------------------------------------
    return NextResponse.json(
      {
        error: "Failed to fetch logs",
      },
      { status: 500 }
    );
  }
}