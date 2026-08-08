# PulseGrid — Architecture Decisions

## Decision 001 — Zerops Private Network

### Decision
PulseGrid will run its core services inside the Zerops private network.

### Why
The hackathon requires meaningful Zerops usage. Keeping API, Worker, PostgreSQL, Valkey and NATS on the private network demonstrates real multi-service architecture.

### Alternative considered
Using external hosting such as Vercel/Render for the backend and database.

### Why rejected
That would weaken the project's meaningful Zerops integration and make the architecture less impressive for judging.

---

## Decision 002 — PostgreSQL as Source of Truth

### Decision
PostgreSQL stores services, dependencies, checks, incidents and alert history.

### Why
PulseGrid needs historical health data, dependency relationships and incident timelines.

### Alternative considered
Using only an in-memory/cache database.

### Why rejected
Historical checks and incident data must survive worker restarts and provide reliable statistics.

---

## Decision 003 — Valkey for Current Status

### Decision
Valkey stores the latest service status and is used for short-lived locks/pub-sub.

### Why
The dashboard needs fast current-status reads without repeatedly querying historical PostgreSQL data.

### Alternative considered
Reading the latest check directly from PostgreSQL for every dashboard request.

### Why rejected
It creates unnecessary database reads and does not demonstrate meaningful Valkey usage.

---

## Decision 004 — NATS for Events

### Decision
NATS is used for probe-result and incident events.

### Why
The worker can publish probe results while other components consume events without tightly coupling the services.

### Alternative considered
Direct API-to-worker database communication only.

### Why rejected
NATS gives PulseGrid a clearer event-driven architecture and meaningful Zerops service usage.

---

## Decision 005 — BFS for Blast Radius

### Decision
PulseGrid will use iterative BFS to find downstream services affected by a failed dependency.

### Why
The MVP dependency graph is small, and BFS is straightforward to implement, test and explain.

### Alternative considered
A recursive SQL CTE.

### Why rejected
BFS keeps the correlation logic explicit in application code and is easier to explain during judging.

---

## Decision 006 — Worker Scheduler

### Decision
The worker will use an always-running internal scheduler loop to check for services that are due for probing.

### Why
A 10–15 second loop is simple and directly matches the PRD requirement for frequent probing.

### Alternative
Zerops cron can be used as a backup/alternative trigger.

### Why rejected for the primary loop
The internal scheduler keeps the MVP simpler and avoids depending on second-level cron behavior.