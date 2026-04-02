-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 004b
-- Hardened Vote RPC — fixes all real validation gaps
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
  v_voter       voter_eligibility%ROWTYPE;
  v_election    elections%ROWTYPE;
  v_sub_id      UUID;
  v_code        TEXT;
  v_sel         JSONB;
  v_position_id UUID;
  v_candidate_id UUID;
  v_max_votes   INTEGER;
  v_vote_count  INTEGER;
  v_sel_count   INTEGER;
BEGIN
  -- ── STEP 1: Lock voter row ────────────────────────────────────────
  SELECT * INTO v_voter
  FROM voter_eligibility
  WHERE election_id = p_election_id
    AND student_id  = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VOTER_NOT_FOUND';
  END IF;

  -- ── STEP 2: Check voter is eligible ──────────────────────────────
  IF NOT v_voter.eligible THEN
    RAISE EXCEPTION 'VOTER_NOT_ELIGIBLE';
  END IF;

  -- ── STEP 3: Re-validate election is active right now ─────────────
  SELECT * INTO v_election
  FROM elections
  WHERE id         = p_election_id
    AND status     = 'active'
    AND start_time <= NOW()
    AND end_time   > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ELECTION_NOT_ACTIVE';
  END IF;

  -- ── STEP 4: Verify voter has not already voted ───────────────────
  IF v_voter.has_voted THEN
    RAISE EXCEPTION 'ALREADY_VOTED';
  END IF;

  -- ── STEP 5: Reject empty ballot ──────────────────────────────────
  v_sel_count := jsonb_array_length(p_selections);
  IF v_sel_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_BALLOT';
  END IF;

  -- ── STEP 6: Validate every selection ─────────────────────────────
  -- Check candidate belongs to election, position belongs to election,
  -- candidate belongs to position, candidate is still active
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_position_id  := (v_sel->>'position_id')::UUID;
    v_candidate_id := (v_sel->>'candidate_id')::UUID;

    -- Validate the full relationship in one query
    IF NOT EXISTS (
      SELECT 1 FROM candidates c
      JOIN positions p ON p.id = c.position_id
      WHERE c.id          = v_candidate_id
        AND c.position_id = v_position_id
        AND c.election_id = p_election_id
        AND p.election_id = p_election_id
        AND c.status      = 'active'
    ) THEN
      RAISE EXCEPTION 'INVALID_SELECTION';
    END IF;
  END LOOP;

  -- ── STEP 7: Check for duplicate positions in one ballot ──────────
  -- A student cannot vote for the same position twice
  IF (
    SELECT COUNT(DISTINCT (value->>'position_id'))
    FROM jsonb_array_elements(p_selections)
  ) < v_sel_count THEN
    RAISE EXCEPTION 'DUPLICATE_POSITION_IN_BALLOT';
  END IF;

  -- ── STEP 8: Enforce max_votes per position ───────────────────────
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    v_position_id := (v_sel->>'position_id')::UUID;

    SELECT max_votes INTO v_max_votes
    FROM positions
    WHERE id = v_position_id;

    SELECT COUNT(*) INTO v_vote_count
    FROM jsonb_array_elements(p_selections) s
    WHERE (s->>'position_id')::UUID = v_position_id;

    IF v_vote_count > v_max_votes THEN
      RAISE EXCEPTION 'MAX_VOTES_EXCEEDED';
    END IF;
  END LOOP;

  -- ── STEP 9: Consume the submission token ─────────────────────────
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

  -- ── STEP 10: Create ballot submission record ──────────────────────
  v_code := upper(encode(gen_random_bytes(6), 'hex'));

  INSERT INTO ballot_submissions (
    election_id, student_id, submission_token,
    confirmation_code, submitted_at, client_ip_hash
  ) VALUES (
    p_election_id, p_student_id, p_token,
    v_code, NOW(), p_ip_hash
  ) RETURNING id INTO v_sub_id;

  -- ── STEP 11: Insert vote rows — append only ───────────────────────
  INSERT INTO votes (election_id, submission_id, position_id, candidate_id)
  SELECT
    p_election_id,
    v_sub_id,
    (sel->>'position_id')::UUID,
    (sel->>'candidate_id')::UUID
  FROM jsonb_array_elements(p_selections) AS sel;

  -- ── STEP 12: Mark voter as voted ─────────────────────────────────
  UPDATE voter_eligibility
  SET    has_voted = true,
         voted_at  = NOW()
  WHERE  election_id = p_election_id
    AND  student_id  = p_student_id;

  -- ── STEP 13: Write audit log ──────────────────────────────────────
  INSERT INTO audit_logs (
    actor_type, actor_id, action,
    target_type, target_id, metadata, ip_hash
  ) VALUES (
    'student', p_student_id, 'VOTE_SUBMITTED',
    'ballot_submission', v_sub_id::text,
    jsonb_build_object(
      'confirmation_code', v_code,
      'selections_count',  v_sel_count
    ),
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

-- ── UNIQUE CONSTRAINT: one vote per position per submission ────────
-- Prevents duplicate vote rows at the database level
ALTER TABLE votes
  ADD CONSTRAINT unique_vote_per_position_per_submission
  UNIQUE (submission_id, position_id);