# DevBoard

DevBoard is a self-hosted observability platform in progress. The target is a production-grade tool that helps teams understand what happened across services, why requests failed, and where latency or errors were introduced.

This repository is currently in the centralized logging stage. The project card is the destination, not a claim that every capability is complete today.

## Target Platform

DevBoard should eventually support three core observability signals:

- Logs: what happened.
- Metrics: how often, how slow, and how much.
- Traces: where a request went and where it slowed down.

The product should help answer questions like:

- Why did this request fail?
- Which service caused the latency spike?
- What changed before the error rate increased?
- Which trace, log line, or endpoint explains the bottleneck?

## Current State

The first slice is centralized logging:

```text
Next.js API -> PostgreSQL
POST /api/logs
GET /api/logs
Filtering by service and level
Time-range filtering
Limit/offset pagination
Swagger documentation
```

Useful local routes:

```text
GET /api/openapi
GET /docs
POST /api/logs
GET /api/logs
POST /api/services
```

## Phase 1: Production-Grade Logs

Goal:

```text
Logs become useful for debugging real services.
```

Add or harden:

- Request validation.
- Client-provided timestamps.
- Time-range filtering.
- Pagination.
- Database indexes.
- Correlation IDs.
- Structured metadata search.

The `logs` table should evolve toward:

```sql
logs (
  id uuid primary key,
  timestamp timestamptz not null,
  received_at timestamptz not null default now(),
  level text not null,
  service text not null,
  environment text not null,
  message text not null,
  trace_id text,
  span_id text,
  request_id text,
  metadata jsonb
)
```

Why these fields matter:

- `timestamp` is when the event happened.
- `received_at` is when DevBoard received it.
- `environment` separates production, staging, local, and other environments.
- `trace_id` connects logs to traces.
- `request_id` connects logs across one request.
- `metadata` stores flexible structured context.

Recommended indexes:

```sql
CREATE INDEX logs_timestamp_idx ON logs (timestamp DESC);
CREATE INDEX logs_service_idx ON logs (service);
CREATE INDEX logs_level_idx ON logs (level);
CREATE INDEX logs_trace_id_idx ON logs (trace_id);
CREATE INDEX logs_metadata_gin_idx ON logs USING gin (metadata);
```

This unlocks queries like:

```text
Show me all errors from payment-api in production in the last 30 minutes.
Show me all logs for trace abc123.
Search logs where metadata.userId = 42.
```

## Phase 2: Metrics

Goal:

```text
Measure system health and performance over time.
```

Add:

```text
POST /api/metrics
```

Example payload:

```json
{
  "name": "http_request_duration_ms",
  "value": 184,
  "timestamp": "2026-04-27T10:00:00Z",
  "service": "api",
  "environment": "production",
  "tags": {
    "route": "/login",
    "method": "POST",
    "status": "200"
  }
}
```

Start with:

```sql
metrics (
  id uuid primary key,
  timestamp timestamptz not null,
  received_at timestamptz not null default now(),
  name text not null,
  value double precision not null,
  service text not null,
  environment text not null,
  tags jsonb
)
```

Indexes:

```sql
CREATE INDEX metrics_name_time_idx ON metrics (name, timestamp DESC);
CREATE INDEX metrics_service_time_idx ON metrics (service, timestamp DESC);
CREATE INDEX metrics_tags_gin_idx ON metrics USING gin (tags);
```

Query endpoints:

```text
GET /api/metrics?name=http_requests_total&service=api&from=...&to=...
GET /api/metrics/summary?name=http_request_duration_ms&groupBy=service
```

Aggregation queries should support:

```sql
avg(value)
max(value)
min(value)
count(*)
percentile_cont(0.95)
```

This enables:

```text
request count
error rate
average latency
p95 latency
p99 latency
```

## Phase 3: Traces

Goal:

```text
Follow one request across multiple services.
```

Add:

```text
POST /api/traces
```

Example payload:

```json
{
  "traceId": "trace_123",
  "spanId": "span_api",
  "parentSpanId": null,
  "service": "api",
  "operation": "POST /checkout",
  "startTime": "2026-04-27T10:00:00Z",
  "endTime": "2026-04-27T10:00:00.240Z",
  "durationMs": 240,
  "status": "ok",
  "attributes": {
    "http.method": "POST",
    "http.route": "/checkout"
  }
}
```

Table:

```sql
spans (
  id uuid primary key,
  trace_id text not null,
  span_id text not null,
  parent_span_id text,
  service text not null,
  operation text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_ms integer not null,
  status text not null,
  attributes jsonb
)
```

Indexes:

```sql
CREATE INDEX spans_trace_id_idx ON spans (trace_id);
CREATE INDEX spans_service_time_idx ON spans (service, start_time DESC);
CREATE INDEX spans_duration_idx ON spans (duration_ms DESC);
```

Then add:

```text
GET /api/traces/:traceId
```

That endpoint reconstructs a trace tree:

```text
api POST /checkout
  |- auth-service validate-token
  |- payment-service charge-card
  `- db SELECT orders
```

This lets DevBoard explain request latency, for example:

```text
This request was slow because payment-service took 1.8s.
```

## Phase 4: Correlation Layer

Goal:

```text
Connect logs, metrics, and traces.
```

Every log should optionally include:

```text
trace_id
span_id
request_id
```

Every span should include:

```text
service
operation
duration
status
```

Metrics should include tags like:

```text
service
route
status
environment
```

Build these flows:

- Trace detail page -> show related logs by `trace_id`.
- Service page -> show metrics and recent errors.
- Log row -> click `trace_id` -> open trace.
- Slow metric spike -> show traces during that time window.

This is where users debug instead of just staring at charts.

## Phase 5: OpenTelemetry Support

Goal:

```text
Accept telemetry from real applications using OpenTelemetry.
```

OpenTelemetry has three major data types:

```text
logs
metrics
traces
```

Eventually support OTLP-style ingestion:

```text
POST /v1/traces
POST /v1/logs
POST /v1/metrics
```

Future architecture:

```text
App -> OpenTelemetry SDK -> OTel Collector -> DevBoard
```

This is the milestone where DevBoard becomes compatible with real production instrumentation.

## Phase 6: Query Performance And High-Cardinality Data

High cardinality means fields with many unique values:

```text
userId
requestId
traceId
sessionId
customerId
endpoint
containerId
```

Postgres is good for the early version. At scale, improve in layers.

Optimize Postgres first:

```text
indexes
GIN indexes on jsonb
partitioning by time
materialized views
retention policies
rollups
```

Explore specialized storage later:

```text
ClickHouse
TimescaleDB
Citus
columnar Postgres extensions
```

Recommended path:

```text
Postgres now
partitioned Postgres later
columnar analytics backend after that
```

Do not jump to columnar storage before ingestion and query paths work.

## Phase 7: Rollups And Materialized Views

Raw telemetry grows quickly, so dashboards need pre-aggregation.

Example rollup table:

```sql
metric_rollups_1m (
  bucket timestamptz,
  service text,
  metric_name text,
  count bigint,
  avg_value double precision,
  max_value double precision,
  p95_value double precision
)
```

Start with materialized views:

```sql
CREATE MATERIALIZED VIEW metrics_1m AS ...
```

Later, build background jobs to refresh rollups.

This is how DevBoard can reach:

```text
sub-second dashboard queries over weeks of data
```

## Phase 8: UI Dashboard

Build pages in this order:

1. Logs page: filters for service, level, time range, and search.
2. Log detail panel: metadata, trace ID, and request ID.
3. Metrics page: latency, error rate, and throughput line charts.
4. Services page: health overview per service.
5. Traces page: search by service, duration, and status.
6. Trace detail page: waterfall/timeline view.
7. Correlation view: trace, related logs, and metrics around the same timestamp.

This is where DevBoard starts feeling like a focused Grafana/Honeycomb/Datadog-style tool.

## Phase 9: Ingestion Architecture

Current architecture:

```text
API -> Database
```

That is fine while learning and building the first slices. For production burst traffic, move toward:

```text
Client SDK / OTel Collector
        |
        v
Ingestion API
        |
        v
Queue / Buffer
        |
        v
Worker
        |
        v
Storage
        |
        v
Query API
        |
        v
Dashboard
```

Possible tools:

```text
Redis Streams
Kafka
NATS
BullMQ
```

Recommended path:

```text
Redis Streams first
Kafka later
```

## Phase 10: Deployment

The project card mentions:

```text
single-binary deploy with zero external deps
```

With the current Next.js and Postgres stack, the realistic near-term target is:

```text
single-command self-hosted deploy
```

Option A:

```text
Docker Compose:
- devboard-web
- postgres
- redis
```

Option B:

```text
DevBoard app container + managed Postgres
```

Option C, if pursuing true single-binary later:

```text
Go backend + embedded UI + embedded SQLite/DuckDB
```

For this stack, the practical production-grade target is:

```bash
docker compose up -d
```

## Recommended Build Order

### Milestone 1: Finish Logs

Add:

```text
time filtering
pagination
indexes
Zod validation
trace_id/request_id fields
```

### Milestone 2: Logs UI

Build:

```text
logs table
filters
details drawer
auto-refresh
```

### Milestone 3: Metrics Backend

Add:

```text
metrics table
POST /api/metrics
GET /api/metrics
basic aggregation
```

### Milestone 4: Metrics UI

Build:

```text
latency chart
error-rate chart
request-count chart
service filter
```

### Milestone 5: Traces Backend

Add:

```text
spans table
POST /api/traces
GET /api/traces/:traceId
trace tree reconstruction
```

### Milestone 6: Trace UI

Build:

```text
trace list
trace waterfall
slow span highlighting
related logs
```

### Milestone 7: Correlation

Add:

```text
click log -> trace
click trace -> logs
click service -> metrics/logs/traces
```

### Milestone 8: OpenTelemetry Compatibility

Add:

```text
OTLP-like ingestion
sample demo app instrumented with OTel SDK
```

### Milestone 9: Scale Layer

Add:

```text
Redis/Kafka buffer
workers
batch inserts
partitioning
rollups
retention
```

### Milestone 10: Production Polish

Add:

```text
auth
projects/workspaces
API keys
rate limits
deployment docs
monitoring DevBoard itself
```

An observability tool should observe itself. Meta, but necessary.

## What This Project Teaches

This project covers:

```text
database schema design
API contracts
query optimization
time-series data modeling
distributed tracing
OpenTelemetry concepts
background workers
storage tradeoffs
dashboard UI
deployment
```

Difficulty progression:

```text
Logs: medium
Metrics: medium-hard
Traces: hard
OTLP compatibility: hard
High-cardinality scale: very hard
Single-binary deploy: separate architecture challenge
```

## Immediate Next Step

The next bridge from basic logs API to real observability foundation is:

```text
Add trace_id, request_id, time filtering, pagination, and indexes to logs.
```

