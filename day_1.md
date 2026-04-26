# DevBoard – Build in Public (Milestone 1)

## Overview

This is the first milestone of building **DevBoard**, a self-hosted observability platform.

Goal for v1:
- Accept logs via HTTP
- Store them in a database
- Query and filter them

This milestone focuses on building a **log ingestion + query backend**.

## Architecture (v1)

Client → API → PostgreSQL

[Client]
    |
    v
[Next.js API Routes]
    |
    v
[PostgreSQL (Docker)]


No queues, no streaming, no distributed systems yet — just a solid foundation.



## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **PostgreSQL (Docker)**
- **Drizzle ORM**
- **Docker Compose**


## Step 1 – Database Setup (Docker)

Created a PostgreSQL container:

```yaml
services:
  postgres:
    image: postgres:15
    ports:
      - "55432:5432"
    environment:
      POSTGRES_USER: devboard
      POSTGRES_PASSWORD: devboard
      POSTGRES_DB: devboard
````

### Key Learning

* Avoid `5432` conflicts → used `55432`
* Use `127.0.0.1` instead of `localhost` to avoid routing issues


## Step 2 – Schema Design

Defined a logs table:

```sql
CREATE TABLE logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL,
  service text NOT NULL,
  message text NOT NULL,
  metadata jsonb
);
```

### Design Decisions

* `timestamp` → main query dimension
* `service` → multi-service filtering
* `jsonb` → flexible structured logging


## Step 3 – Drizzle ORM Setup

```ts
export const logs = pgTable("logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  level: text("level").notNull(),
  service: text("service").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
});
```

### Migration

```bash
npx drizzle-kit generate
docker exec -i devboard-postgres-1 psql -U devboard -d devboard < drizzle.sql
```


## Step 4 – Log Ingestion API

```ts
export async function POST(req: NextRequest) {
  const { level, service, message, metadata } = await req.json();

  await db.insert(logs).values({
    level,
    service,
    message,
    metadata,
  });

  return NextResponse.json({ success: true });
}
```

### Test

```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"level":"info","service":"test","message":"hello"}'
```

---

## Step 5 – Query API

```ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const service = searchParams.get("service");
  const level = searchParams.get("level");

  const filters = [];

  if (service) filters.push(eq(logs.service, service));
  if (level) filters.push(eq(logs.level, level));

  const data = await db
    .select()
    .from(logs)
    .where(filters.length ? and(...filters) : undefined)
    .limit(50);

  return NextResponse.json({ data });
}
```


## Major Issues & Fixes

### 1. Docker Pull Failures

* Network/DNS issues during image download
* Fixed via retry + stable connection


### 2. WSL Setup Failures

* Broken Ubuntu install
* Fixed by unregistering and reinstalling


### 3. Password Authentication Errors

Cause:

* Connecting to wrong PostgreSQL instance (local vs Docker)

Fix:

* Changed port → `55432`
* Used `127.0.0.1` instead of `localhost`


### 4. Table Not Found

Cause:

* Migration not applied to correct DB

Fix:

* Applied SQL directly inside container


### 5. Drizzle Type Errors

Cause:

* Reassigning query after `.where()`

Fix:

* Use `and(...filters)` instead


## Current State

Working system:

* POST /api/logs → ingest logs
* GET /api/logs → fetch logs
* Filtering by:

  * service
  * level


## What This Actually Is

At this stage, DevBoard is:

> A log ingestion and querying service backed by PostgreSQL



#docker exec -it devboard-postgres-1 psql -U devboard -d devboard
This is how to enter psql to interact with your database