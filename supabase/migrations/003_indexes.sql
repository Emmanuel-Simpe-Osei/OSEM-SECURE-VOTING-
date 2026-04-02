-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 003
-- Performance Indexes
-- ══════════════════════════════════════════════════════════════════

-- Voter lookup — most frequent query in the system
CREATE INDEX idx_voter_election_student
  ON voter_eligibility(election_id, student_id);

-- Active OTP lookup — partial index, only unused OTPs
CREATE INDEX idx_otp_active
  ON otp_challenges(student_id, election_id)
  WHERE used_at IS NULL;

-- Active token lookup — partial index, only unused tokens
CREATE INDEX idx_token_active
  ON ballot_submission_tokens(token)
  WHERE used_at IS NULL;

-- Results aggregation
CREATE INDEX idx_votes_results
  ON votes(election_id, position_id, candidate_id);

-- Audit log queries by actor
CREATE INDEX idx_audit_actor
  ON audit_logs(actor_id, created_at DESC);

-- Elections by status for admin dashboard
CREATE INDEX idx_elections_status
  ON elections(status, start_time);

-- Incident flags by election
CREATE INDEX idx_incidents_election
  ON incident_flags(election_id, status, created_at DESC);