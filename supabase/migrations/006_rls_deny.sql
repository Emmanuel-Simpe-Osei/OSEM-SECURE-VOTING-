-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 006
-- Explicit deny policies on sensitive tables
-- Prevents accidental future policy mistakes from opening access
-- ══════════════════════════════════════════════════════════════════

-- voter_eligibility — no direct public access ever
CREATE POLICY "Deny all direct access to voter_eligibility"
  ON voter_eligibility
  FOR ALL
  TO anon, authenticated
  USING (false);

-- otp_challenges — no direct public access ever
CREATE POLICY "Deny all direct access to otp_challenges"
  ON otp_challenges
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ballot_submission_tokens — no direct public access ever
CREATE POLICY "Deny all direct access to ballot_submission_tokens"
  ON ballot_submission_tokens
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ballot_submissions — no direct public access ever
CREATE POLICY "Deny all direct access to ballot_submissions"
  ON ballot_submissions
  FOR ALL
  TO anon, authenticated
  USING (false);

-- admin_users — no direct public access ever
CREATE POLICY "Deny all direct access to admin_users"
  ON admin_users
  FOR ALL
  TO anon, authenticated
  USING (false);

-- incident_flags — no direct public access ever
CREATE POLICY "Deny all direct access to incident_flags"
  ON incident_flags
  FOR ALL
  TO anon, authenticated
  USING (false);