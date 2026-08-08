-- 001_init.sql
-- Initial schema for PulseGrid

-- Services table to store endpoints to be probed
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    check_interval_seconds INTEGER NOT NULL DEFAULT 60 CHECK (check_interval_seconds >= 30 AND check_interval_seconds <= 300),
    description TEXT,
    owner_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    region_label VARCHAR(255) NOT NULL DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Dependencies table to store the graph: service A (service_id) depends on service B (depends_on_service_id)
CREATE TABLE IF NOT EXISTS dependencies (
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    depends_on_service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (service_id, depends_on_service_id),
    CONSTRAINT no_self_dependency CHECK (service_id != depends_on_service_id)
);

-- Checks table to store point-in-time probe results (time-series)
CREATE TABLE IF NOT EXISTS checks (
    id BIGSERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id), -- No ON DELETE CASCADE for historical data
    status VARCHAR(50) NOT NULL CHECK (status IN ('up', 'degraded', 'down')),
    latency_ms INTEGER, -- Nullable
    http_status_code INTEGER,
    error_message TEXT,
    region VARCHAR(255),
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index to optimize querying recent checks for a specific service
CREATE INDEX IF NOT EXISTS idx_checks_service_id_checked_at ON checks (service_id, checked_at DESC);

-- Incidents table to record correlated failures
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    root_service_id INTEGER NOT NULL REFERENCES services(id), -- No ON DELETE CASCADE for historical data
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    severity VARCHAR(50) NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index to quickly find open incidents
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
-- Index to quickly find incidents by root service
CREATE INDEX IF NOT EXISTS idx_incidents_root_service_id ON incidents (root_service_id);

-- Incident services table to record the blast radius (which services were affected by the incident)
CREATE TABLE IF NOT EXISTS incident_services (
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id), -- No ON DELETE CASCADE for historical data
    role VARCHAR(50) NOT NULL CHECK (role IN ('root', 'affected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (incident_id, service_id)
);

-- Index to query incidents by affected services efficiently
CREATE INDEX IF NOT EXISTS idx_incident_services_service_id ON incident_services (service_id);

-- Alert rules to store webhook configurations
CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE, -- Null means global webhook
    webhook_url VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Alert history to record webhook delivery attempts/results
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    alert_rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('open', 'resolved')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
