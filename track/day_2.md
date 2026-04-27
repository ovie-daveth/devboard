# DevBoard - Build in Public (Milestone 1, Day 2)

## Overview

What I have achieved today (27th April, 2026)

- Swagger documentation
- Better log querying
- Time filtering
- Pagination
- Database indexes
- Service registration
- Service listing

## Commits Today

I made three main commits:

```text
169f6fb feat: add Swagger UI for API documentation and OpenAPI specification
8242c4f feat(logging): enhance logging API with pagination, filtering, and error handling; add service registration endpoint
65945d7 feat(api): add GET endpoint for listing registered services and update OpenAPI documentation
```

## Step 1 - Swagger API Documentation

Added interactive API documentation using Swagger UI.

New routes:

```text
GET /api/openapi
GET /docs
```

Files added:

```text
app/api/openapi/route.ts
app/docs/page.tsx
app/docs/swagger-ui.tsx
lib/openapi.ts
```

The OpenAPI route serves the API specification:

```ts
export async function GET() {
  return NextResponse.json(openApiDocument);
}
```

The docs page renders Swagger UI:

```tsx
<SwaggerUI
  url="/api/openapi"
  docExpansion="list"
  defaultModelsExpandDepth={1}
  tryItOutEnabled
/>
```

### Why This Matters

Before this, the API existed but had to be remembered manually.

Now DevBoard has a place where I can:

- See available endpoints
- Inspect request bodies
- Inspect response shapes
- Test endpoints from the browser
- Keep the API contract visible as the platform grows

This is important because DevBoard will eventually have logs, metrics, traces, services, auth, and ingestion endpoints. Without API documentation, the backend becomes hard to reason about quickly.

## Step 2 - Improved Log Query API

The log query endpoint became more useful.

Before:

```text
GET /api/logs
Filter by service
Filter by level
Limit 50
```

After:

```text
GET /api/logs?service=api&level=error&from=...&to=...&limit=20&offset=0
```

Added support for:

- `service`
- `level`
- `from`
- `to`
- `limit`
- `offset`

This means logs can now be queried by time window and paginated.

Example:

```text
GET /api/logs?service=payment-api&level=error&limit=10&offset=0
```

### Pagination

Added limit/offset pagination.

```text
limit = how many rows to return
offset = how many rows to skip
```

Examples:

```text
Page 1: limit=10&offset=0
Page 2: limit=10&offset=10
Page 3: limit=10&offset=20
```

This prepares the API for a logs table UI.

## Step 3 - Time Filtering

Added time-range filtering to logs.

This allows queries like:

```text
Show me errors from the last 30 minutes.
Show me logs between two timestamps.
Show me production incidents around a specific time.
```

The API now supports:

```text
from
to
```

Example:

```text
GET /api/logs?from=2026-04-27T10:00:00Z&to=2026-04-27T11:00:00Z
```

### Why This Matters

Logs are usually debugged by time.

When something fails, the first question is often:

```text
What happened around the time of the incident?
```

Time filtering makes the logs endpoint much closer to a real observability tool.

## Step 4 - Database Indexes

Added indexes to the logs table through Drizzle schema changes.

Current indexed fields:

```text
timestamp
service
level
```

In Drizzle:

```ts
timestampIdx: index("timestamp_idx").on(table.timestamp),
serviceIdx: index("service_idx").on(table.service),
levelIdx: index("level_idx").on(table.level),
```

### Why This Matters

These are the main query dimensions for logs:

- Time range
- Service
- Severity level

Without indexes, filtering will get slower as the logs table grows.

This is the beginning of query-performance thinking.

## Step 5 - Service Registration

Added a new service registry endpoint:

```text
POST /api/services
```

Example payload:

```json
{
  "service": "worker"
}
```

This stores service names in a dedicated table:

```ts
export const servicesType = pgTable("services_type", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});
```

### Why This Matters

DevBoard needs to understand services as first-class objects.

Logs currently include a `service` string, but a real dashboard needs a place to list and manage known services.

This unlocks future pages like:

```text
/services
/services/payment-api
/services/api/logs
/services/api/metrics
/services/api/traces
```

## Step 6 - Service Listing

Added:

```text
GET /api/services
```

This returns registered services ordered by name.

Example response shape:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "api"
    }
  ]
}
```

### Why This Matters

The frontend will need a list of services for:

- Filter dropdowns
- Service dashboards
- Service health pages
- Logs and metrics filtering

This is a small endpoint, but it is important platform plumbing.

## Step 7 - OpenAPI Updates

Updated `lib/openapi.ts` so Swagger knows about:

- Logs API
- Log filters
- Pagination parameters
- Services API
- Service registration response
- Service listing response

This keeps the docs aligned with the backend.

## Current API Surface

After Day 2:

```text
POST /api/logs
GET /api/logs
POST /api/services
GET /api/services
GET /api/openapi
GET /docs
```

## Current Database Direction

Current core tables:

```text
logs
services_type
```

Current logging query fields:

```text
timestamp
service
level
metadata
```

Current service fields:

```text
id
name
```

## Major Learnings

### 1. API Docs Are Part Of The Product

Swagger is not just polish.

For a platform like DevBoard, docs help define the API contract while the product is still changing.

### 2. Logs Need Time As A First-Class Query Dimension

Filtering by service and level is useful, but time filtering is what makes logs practical for debugging incidents.

### 3. Pagination Is Needed Before UI

A logs table cannot fetch every row forever.

`limit` and `offset` are a simple first version that will work for the early dashboard.

### 4. Services Need Their Own Model

Services should not only exist as strings inside log rows.

Having a services table makes it easier to build dashboards, filters, and service-level views later.

### 5. Indexes Should Follow Query Patterns

The first indexes match the first filters:

```text
timestamp
service
level
```

This keeps the database design connected to real API behavior.

## Current State

DevBoard now has:

- Working log ingestion
- Working log querying
- Service and level filtering
- Time filtering
- Pagination
- Basic log indexes
- Service registration
- Service listing
- Swagger API documentation

At this point, DevBoard is becoming:

> A documented log ingestion and query backend with service awareness.



After that, the next major product step is:

```text
Build the Logs UI.
```

The Logs UI should include:

- Logs table
- Service filter
- Level filter
- Time range filter
- Pagination controls
- Log detail drawer
- Metadata viewer
- Auto-refresh

That will turn the backend work into something visible and usable.
