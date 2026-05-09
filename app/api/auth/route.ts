import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { AuthorsType } from "@/db/schema";
import {
  and,
  desc,
  eq,
  gte,
  lte,
  lt,
  type SQL,
} from "drizzle-orm";
import bcrypt from "bcrypt";
import { getAuthTokenForAuthor } from "@/lib/utilities/token";



export const POST = async (request: NextRequest) => {
    try {
        const { name, email, password } = await request.json();

        if (!name ) {
            return NextResponse.json({ error: "Name is required." }, { status: 400 });
        }

        if (!email) {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }
        if (!password) {
            return NextResponse.json({ error: "Password is required." }, { status: 400 });
        }

        const existingAuthor = await db.select().from(AuthorsType).where(eq(AuthorsType.email, email)).limit(1);

        if (existingAuthor.length > 0) {
            return NextResponse.json({ error: "Author with this email already exists." }, { status: 400 });
        }

        const hash = await bcrypt.hash(password, 10);
        const token = getAuthTokenForAuthor({ userId: hash, email });

        if (!token) {
            return NextResponse.json({ error: "Failed to generate auth token." }, { status: 500 });
        }
 
        await db.insert(AuthorsType).values({
            name,
            email,
            passwordHash: hash,
        }).then(() => {
            return NextResponse.json({ message: "Author created successfully.", token }, { status: 201 });
        }).catch((error) => {            
            console.error("Error inserting author:", error);
            return NextResponse.json({ error: "Internal server error." }, { status: 500 });
        });

    } catch (error) {
        console.error("Error creating author:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}