-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Migration 005
-- OTP attempt counter enforcement
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_otp_attempt(
  p_election_id UUID,
  p_student_id  TEXT,
  p_otp_hash    TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp otp_challenges%ROWTYPE;
BEGIN
  -- Get the most recent unused OTP for this student
  SELECT * INTO v_otp
  FROM otp_challenges
  WHERE election_id = p_election_id
    AND student_id  = p_student_id
    AND used_at     IS NULL
    AND expires_at  > NOW()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;  -- Lock row to prevent concurrent verification

  -- No valid OTP found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'OTP_NOT_FOUND_OR_EXPIRED'
    );
  END IF;

  -- Already exceeded max attempts
  IF v_otp.attempt_count >= v_otp.max_attempts THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason',  'MAX_ATTEMPTS_EXCEEDED'
    );
  END IF;

  -- Wrong OTP — increment attempt counter
  IF v_otp.otp_hash != p_otp_hash THEN
    UPDATE otp_challenges
    SET attempt_count = attempt_count + 1
    WHERE id = v_otp.id;

    RETURN jsonb_build_object(
      'success',           false,
      'reason',            'INVALID_OTP',
      'attempts_remaining', v_otp.max_attempts - v_otp.attempt_count - 1
    );
  END IF;

  -- Correct OTP — mark as used
  UPDATE otp_challenges
  SET used_at = NOW()
  WHERE id = v_otp.id;

  RETURN jsonb_build_object(
    'success', true,
    'reason',  'OTP_VERIFIED'
  );
END;
$$;