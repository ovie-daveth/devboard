import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { logs } from "@/db/schema";
import {
  and,
  desc,
  eq,
  gte,
  lte,
  lt,
  type SQL,
} from "drizzle-orm";
import { createLogSchema } from "@/lib/validations/log";

const VALID_LOG_LEVELS = new Set([
  "debug",
  "info",
  "warn",
  "error",
]);

const VALID_ENVIRONMENTS = new Set([
  "development",
  "staging",
  "production",
]);

const DEFAULT_LIMIT = 50;
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

    const body = await req.json();

    // Validate payload with Zod
    const parsed = createLogSchema.safeParse(body);
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

    // Extract validated data
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
      timestamp: log.timestamp ?? new Date(),
      environment: log.environment,
      traceId: log.traceId,
      spanId: log.spanId,
      requestId: log.requestId,
      metadata: log.metadata,
    });

    // Success response
    return NextResponse.json(
      {
        success: true,
      },
      { status: 201 }
    );

  } catch (err) {

    console.error("LOG_INGEST_ERROR:", err);
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
// =============================================
export async function GET(req: NextRequest) {
  try {

    const { searchParams } = new URL(req.url);

    // Filtering params
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
    // ISO timestamp string
    //
    // Example:
    // 2026-01-01T10:00:00.000Z
    // -----------------------------------------
    const cursor = searchParams.get("cursor");


    // Parse limit safely
    const requestedLimit = parseLimit(
      searchParams.get("limit"),
      DEFAULT_LIMIT
    );


    // Reject invalid limit
    if (requestedLimit === null) {
      return NextResponse.json(
        {
          error: "Invalid limit",
        },
        { status: 400 }
      );
    }

    // Cap limit
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    // Validate level
    if (level && !VALID_LOG_LEVELS.has(level)) {
      return NextResponse.json(
        {
          error: "Invalid level",
        },
        { status: 400 }
      );
    }

    // Validate environment
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

    // Parse dates
    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate === undefined || toDate === undefined) {
      return NextResponse.json(
        {
          error: "Invalid date parameters",
        },
        { status: 400 }
      );
    }

    // Dynamic SQL filters
    const filters: SQL[] = [];

    // Exact-match filters
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

    if (fromDate) {
      filters.push(gte(logs.timestamp, fromDate));
    }

    if (toDate) {
      filters.push(lte(logs.timestamp, toDate));
    }


    // ---------------------------------------------
    // Cursor pagination logic
    //
    // Uses timestamp for pagination
    // ---------------------------------------------
    if (cursor) {
      const cursorDate = parseDate(cursor);

      if (!cursorDate) {
        return NextResponse.json(
          {
            error: "Invalid cursor format",
          },
          { status: 400 }
        );
      }

      // Add cursor condition
      filters.push(lt(logs.timestamp, cursorDate));
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

      // Timestamp-only cursor
      nextCursor = last.timestamp.toISOString();
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