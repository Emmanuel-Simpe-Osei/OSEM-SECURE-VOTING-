-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 001
-- Core Tables
-- ══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ELECTIONS ─────────────────────────────────────────────────────
CREATE TABLE elections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','scheduled','active','paused','closed','archived')),
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  results_visibility  TEXT NOT NULL DEFAULT 'hidden'
                      CHECK (results_visibility IN ('hidden','turnout_only','public_after_close')),
  created_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- ── POSITIONS ─────────────────────────────────────────────────────
-- Each election has positions e.g. President, Secretary
CREATE TABLE positions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  max_votes    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CANDIDATES ────────────────────────────────────────────────────
CREATE TABLE candidates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  position_id  UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  bio          TEXT,
  photo_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','withdrawn','disqualified')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VOTER ELIGIBILITY ─────────────────────────────────────────────
-- The official voter register — one row per eligible student per election
CREATE TABLE voter_eligibility (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL,
  school_email TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  department   TEXT,
  level        TEXT,
  eligible     BOOLEAN NOT NULL DEFAULT true,
  has_voted    BOOLEAN NOT NULL DEFAULT false,
  voted_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Most important constraint in the entire schema
  CONSTRAINT unique_voter_per_election UNIQUE (election_id, student_id)
);

-- ── OTP CHALLENGES ────────────────────────────────────────────────
CREATE TABLE otp_challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id    UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL,
  otp_hash       TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  attempt_count  INTEGER NOT NULL DEFAULT 0,
  max_attempts   INTEGER NOT NULL DEFAULT 5,
  used_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BALLOT SUBMISSION TOKENS ──────────────────────────────────────
-- One-time token issued when student loads the ballot
CREATE TABLE ballot_submission_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL,
  token        TEXT UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BALLOT SUBMISSIONS ────────────────────────────────────────────
-- One accepted ballot per student per election
CREATE TABLE ballot_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id         UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  student_id          TEXT NOT NULL,
  submission_token    TEXT NOT NULL REFERENCES ballot_submission_tokens(token),
  confirmation_code   TEXT UNIQUE NOT NULL,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip_hash      TEXT,
  -- Second independent constraint against double voting
  CONSTRAINT unique_submission_per_election UNIQUE (election_id, student_id)
);

-- ── VOTES ─────────────────────────────────────────────────────────
-- Append-only — no UPDATE, no DELETE ever
CREATE TABLE votes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id    UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  submission_id  UUID NOT NULL REFERENCES ballot_submissions(id) ON DELETE CASCADE,
  position_id    UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id   UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ADMIN USERS ───────────────────────────────────────────────────
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'election_admin'
              CHECK (role IN ('super_admin','election_admin','observer')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOGS ────────────────────────────────────────────────────
-- Permanent — no UPDATE, no DELETE ever
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('student','admin','system')),
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  metadata     JSONB,
  ip_hash      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INCIDENT FLAGS ────────────────────────────────────────────────
CREATE TABLE incident_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID REFERENCES elections(id) ON DELETE CASCADE,
  student_id   TEXT,
  reason       TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'medium'
               CHECK (severity IN ('low','medium','high','critical')),
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','reviewing','resolved','dismissed')),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ
);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elections_updated_at
  BEFORE UPDATE ON elections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();