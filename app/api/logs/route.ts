import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { logs } from "@/db/schema";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

const VALID_LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePaginationParam(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseDateParam(value: string | null): Date | null | undefined {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { level, service, message, metadata } = body;

    if (!level || !service || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await db.insert(logs).values({
      level,
      service,
      message,
      metadata,
    });

    return NextResponse.json({ success: true });
  }  catch (err) {
    console.error("LOG_INGEST_ERROR:", err);

    return NextResponse.json(
      { error: "Failed to ingest log" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const service = searchParams.get("service");
    const level = searchParams.get("level");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const requestedLimit = parsePaginationParam(
      searchParams.get("limit"),
      DEFAULT_LIMIT
    );
    const offset = parsePaginationParam(searchParams.get("offset"), 0);

    if (level && !VALID_LOG_LEVELS.has(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    if (requestedLimit === null || offset === null) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const fromDate = parseDateParam(from);
    const toDate = parseDateParam(to);

    if (fromDate === undefined || toDate === undefined) {
      return NextResponse.json(
        { error: "Invalid date parameters" },
        { status: 400 }
      );
    }

    const filters: SQL[] = [];

    if (service) filters.push(eq(logs.service, service));
    if (level) filters.push(eq(logs.level, level));
    if (fromDate) filters.push(gte(logs.timestamp, fromDate));
    if (toDate) filters.push(lte(logs.timestamp, toDate));

    const data =
      filters.length > 0
        ? await db
            .select()
            .from(logs)
            .where(and(...filters))
            .orderBy(desc(logs.timestamp))
            .limit(limit)
            .offset(offset)
        : await db
            .select()
            .from(logs)
            .orderBy(desc(logs.timestamp))
            .limit(limit)
            .offset(offset);

    return NextResponse.json({
      data,
      meta: {
        limit,
        offset,
        count: data.length,
      },
    });
  } catch (err) {
    console.error("LOG_FETCH_ERROR:", err);

    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
