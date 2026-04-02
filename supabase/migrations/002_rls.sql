-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 002
-- Row Level Security Policies
-- ══════════════════════════════════════════════════════════════════

-- Enable RLS on every table
ALTER TABLE elections                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_eligibility          ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_submission_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_submissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_flags             ENABLE ROW LEVEL SECURITY;

-- ── ELECTIONS ─────────────────────────────────────────────────────
-- Anyone can read active elections (for the public portal)
CREATE POLICY "Public can read active elections"
  ON elections FOR SELECT
  USING (status = 'active');

-- ── POSITIONS ─────────────────────────────────────────────────────
CREATE POLICY "Public can read positions for active elections"
  ON positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = positions.election_id
      AND elections.status = 'active'
    )
  );

-- ── CANDIDATES ────────────────────────────────────────────────────
CREATE POLICY "Public can read active candidates"
  ON candidates FOR SELECT
  USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = candidates.election_id
      AND elections.status = 'active'
    )
  );

-- ── VOTER ELIGIBILITY ─────────────────────────────────────────────
-- No direct public access — all reads go through server routes
-- Server uses service role key which bypasses RLS

-- ── VOTES ─────────────────────────────────────────────────────────
-- Nobody can read, update, or delete votes directly
-- Results are served through aggregation queries via server routes only
-- INSERT is handled by the RPC function (SECURITY DEFINER)

-- ── BALLOT SUBMISSIONS ────────────────────────────────────────────
-- No direct public access

-- ── AUDIT LOGS ────────────────────────────────────────────────────
-- No direct public access — append-only via server routes

-- ── VOTES APPEND-ONLY PROTECTION ─────────────────────────────────
-- Even the service role cannot UPDATE or DELETE votes
-- This is enforced at the policy level
CREATE POLICY "Votes are insert only"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Block all updates and deletes on votes — for every role
CREATE POLICY "No vote updates ever"
  ON votes FOR UPDATE
  USING (false);

CREATE POLICY "No vote deletes ever"
  ON votes FOR DELETE
  USING (false);

-- ── AUDIT LOGS APPEND-ONLY PROTECTION ────────────────────────────
CREATE POLICY "Audit logs are insert only"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No audit log updates ever"
  ON audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "No audit log deletes ever"
  ON audit_logs FOR DELETE
  USING (false);