1. Product Requirements Document (PRD)
1.1 Product Name
PulseGrid
1.2 One-line pitch
Continuously probes endpoints you define, correlates failures across related services using dependency graphs, stores time-series health + incident timelines in Postgres, and surfaces live dashboards + alerts.
1.3 Problem Statement
Simple uptime monitors only tell you “URL X is down”.
In real systems services depend on each other. When one fails, others cascade. Teams waste time figuring out the root cause and blast radius.
PulseGrid solves this by:

Continuously checking services
Understanding dependency relationships
Automatically correlating related failures into incidents
Giving a clear live view + history of what broke, when, and what was affected

1.4 Target Users (for the hackathon)

Solo developers / small teams who run multiple services
Judges who need to see a real multi-service, production-style architecture on Zerops

1.5 Goals for the 48-hour hackathon

A fully working, polished, live product on Zerops
Meaningful use of at least: Frontend + Backend API + PostgreSQL + Valkey + NATS + Worker + Cron
Database is load-bearing (relationships + time-series queries + correlation)
Demo-able in under 2 minutes: add services → watch live status → force a failure → see incident + blast radius
Public GitHub repo + live URL that stays up

1.6 Non-Goals (explicitly out of scope for MVP)

Full multi-region real probing from different geographic locations (simulate with labels only)
Complex authentication / multi-tenancy beyond a simple owner concept
Mobile app
Advanced anomaly ML
Screenshot capture of failed pages (can be stretch)
Real email delivery (webhook is enough; email can be stretch)

1.7 Success Metrics (for judging)

Live URL works reliably
Adding a service + dependency takes < 30 seconds
Dashboard updates in near real-time
Creating an artificial failure produces a correlated incident within ~1 minute
Architecture clearly shows multiple Zerops services talking over private networking
Code is understandable and the builder can explain every decision


1.8 User Personas & Core Jobs
Primary Persona: “Alex – Solo Dev / Small Team Lead”
Wants to know when any of his 5–15 services go down and which other services will be impacted.
Jobs to be done:

Register services and declare dependencies
See current health of everything at a glance
Understand root cause + blast radius when something fails
Look at history (uptime %, past incidents)
Get notified (webhook)


1.9 Core User Stories (MVP)
US-1: As a user I can create a service (name, URL/health endpoint, check interval, optional description).
US-2: As a user I can declare that Service A depends on Service B (directed edge).
US-3: The system continuously probes every service according to its interval.
US-4: Every probe result is stored (status, latency, status code, timestamp, region label).
US-5: I can see a live dashboard with current status of all services (Up / Degraded / Down).
US-6: When a service goes from Up → Down, the system creates or updates an Incident, marks the failing service as root (or affected), and walks the dependency graph to mark downstream services as affected.
US-7: I can open an Incident and see: root cause, list of affected services, timeline of checks, start/resolve times.
US-8: I can see basic uptime % and latency stats for a service over the last 1h / 24h / 7d.
US-9: I can configure a webhook URL that receives a payload when an incident is opened or resolved.
US-10: The whole system stays live on Zerops and recovers gracefully from temporary worker issues.
Stretch User Stories (only if MVP is solid):

Public status page (read-only)
Visual dependency graph
Manual “acknowledge” / “resolve” of incidents
Simple search over incidents
Multi-region label simulation


1.10 Key Product Concepts

Service: Something that has a URL (or health endpoint) that can be probed.
Dependency: Directed edge “A depends on B” (if B is down, A is likely affected).
Check: One probe result (point-in-time).
Incident: A correlated failure event with a root service + list of affected services + timeline.
Current Status: Derived from the most recent checks (cached in Valkey for speed).


1.11 Functional Requirements (MVP)
FR-1 Service Management

Create / list / edit / soft-delete services
Fields: name, url, check_interval_seconds (30–300), description, owner_id (simple), is_active, region_label (default “default”)

FR-2 Dependency Management

Add / remove directed dependency (service_id → depends_on_service_id)
Prevent obvious cycles in MVP (or just document that cycles are user’s responsibility)
Ability to view outgoing + incoming dependencies for a service

FR-3 Probing

Background workers probe according to each service’s interval
Record: status (up/degraded/down), latency_ms, http_status_code, error_message (if any), checked_at, region
“degraded” = status 2xx but latency > threshold (configurable, default 2000 ms) or 3xx

FR-4 Status Derivation

Latest status per service is kept in Valkey for instant dashboard reads
Postgres remains source of truth for history

FR-5 Incident Correlation

When a service transitions to Down:
Create new Incident (or attach to open incident if one exists for that root)
Set root_service_id
Walk dependency graph (downstream) and mark affected services
Write incident_services rows with role = root | affected

When all services in an incident return to Up → auto-resolve incident
Simple severity: critical if root is down, warning if only degraded

FR-6 Dashboard & Detail Views

Global overview: list of services with current status, last latency, last checked
Service detail: uptime %, latency chart (simple), recent checks, dependencies, related incidents
Incident list + incident detail (timeline + affected services)

FR-7 Alerts

User can set one webhook URL (global or per-service in stretch)
On incident open and on incident resolve → POST JSON payload

FR-8 Basic Auth / Ownership (lightweight)

Simple API key or single “owner” concept is enough for hackathon (can be hardcoded or very light JWT/session)


1.12 Non-Functional Requirements

Reliability: System must stay up. Probe failures must not crash workers.
Performance: Dashboard loads < 1 s. Status updates appear within one probe cycle.
Observability: Good logging. Health endpoints on API and workers.
Security: No public write endpoints without protection. Internal services talk only over private network.
Polish: Clean, modern UI. Loading states, empty states, error states. Clear architecture diagram in README.


1.13 Demo Script (must work perfectly)

Open live dashboard → all services green.
Add two services (Frontend + API) and set Frontend depends on API.
Temporarily make the API endpoint return 500 (or stop it).
Within ~60 s the dashboard shows API = Down, Frontend = Affected, a new Incident appears with correct root + blast radius.
Restore API → incident auto-resolves.
Show historical checks and uptime %.