-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 004
-- Atomic Vote Submission RPC
-- Most critical function in the entire system
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_vote_rpc(
  p_election_id  UUID,
  p_student_id   TEXT,
  p_token        TEXT,
  p_selections   JSONB,
  p_ip_hash      TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voter    voter_eligibility%ROWTYPE;
  v_election elections%ROWTYPE;
  v_sub_id   UUID;
  v_code     TEXT;
BEGIN
  -- STEP 1: Lock voter row — blocks all concurrent requests for same student
  SELECT * INTO v_voter
  FROM voter_eligibility
  WHERE election_id = p_election_id
    AND student_id  = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VOTER_NOT_FOUND';
  END IF;

  -- STEP 2: Re-validate election is active right now
  SELECT * INTO v_election
  FROM elections
  WHERE id        = p_election_id
    AND status    = 'active'
    AND start_time <= NOW()
    AND end_time   > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ELECTION_NOT_ACTIVE';
  END IF;

  -- STEP 3: Verify voter has not already voted
  IF v_voter.has_voted THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END IF;

  -- STEP 4: Consume the submission token
  UPDATE ballot_submission_tokens
  SET    used_at = NOW()
  WHERE  token       = p_token
    AND  election_id = p_election_id
    AND  student_id  = p_student_id
    AND  used_at     IS NULL
    AND  expires_at  > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_OR_USED_TOKEN';
  END IF;

  -- STEP 5: Create ballot submission record
  v_code := upper(encode(gen_random_bytes(4), 'hex'));

  INSERT INTO ballot_submissions (
    election_id, student_id, submission_token,
    confirmation_code, submitted_at, client_ip_hash
  ) VALUES (
    p_election_id, p_student_id, p_token,
    v_code, NOW(), p_ip_hash
  ) RETURNING id INTO v_sub_id;

  -- STEP 6: Insert vote rows — append only
  INSERT INTO votes (election_id, submission_id, position_id, candidate_id)
  SELECT
    p_election_id,
    v_sub_id,
    (sel->>'position_id')::UUID,
    (sel->>'candidate_id')::UUID
  FROM jsonb_array_elements(p_selections) AS sel;

  -- STEP 7: Mark voter as voted — inside same transaction
  UPDATE voter_eligibility
  SET    has_voted = true,
         voted_at  = NOW()
  WHERE  election_id = p_election_id
    AND  student_id  = p_student_id;

  -- STEP 8: Write audit log
  INSERT INTO audit_logs (
    actor_type, actor_id, action,
    target_type, target_id, metadata, ip_hash
  ) VALUES (
    'student', p_student_id, 'VOTE_SUBMITTED',
    'ballot_submission', v_sub_id::text,
    jsonb_build_object('confirmation_code', v_code),
    p_ip_hash
  );

  RETURN jsonb_build_object(
    'success',           true,
    'confirmation_code', v_code,
    'submitted_at',      NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;