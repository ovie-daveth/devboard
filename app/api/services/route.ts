import { db } from "@/db";
import { servicesType } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";



export async function POST(req: NextRequest) {
  try {
    const { service } = await req.json();

    if (!service) {
      return NextResponse.json(
        { error: "Missing required field: service" },
        { status: 400 }
      );
    }

    const response = await db.insert(servicesType).values({ name: service });
    return NextResponse.json({ success: true, data: response });
  } catch (err) {
    console.error("SERVICE_FETCH_ERROR:", err);

    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}