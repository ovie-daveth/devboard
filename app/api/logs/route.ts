import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { logs } from "@/db/schema";
import { and, eq } from "drizzle-orm";

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

    const filters = [];

    if (service) {
      filters.push(eq(logs.service, service));
    }

    if (level) {
      filters.push(eq(logs.level, level));
    }

    const data = await db
      .select()
      .from(logs)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .limit(50);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("LOG_FETCH_ERROR:", err);

    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}