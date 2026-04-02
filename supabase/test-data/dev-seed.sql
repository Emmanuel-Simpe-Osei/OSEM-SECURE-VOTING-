-- ══════════════════════════════════════════════════════════════════
-- OSEM SECURE VOTE — Dev Seed
-- Test data only — wipe before real election
-- ══════════════════════════════════════════════════════════════════

-- ── Create a test election first ─────────────────────────────────
INSERT INTO elections (
  id,
  title,
  slug,
  description,
  status,
  start_time,
  end_time,
  results_visibility
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Business & Commerce SRC Election 2026',
  'bcom-src-2026',
  'Student Representative Council Election for the Business and Commerce Department',
  'active',
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '24 hours',
  'hidden'
);

-- ── Positions ────────────────────────────────────────────────────
INSERT INTO positions (id, election_id, name, description, max_votes, sort_order)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'President',
    'Student Representative Council President',
    1,
    1
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Vice President',
    'Student Representative Council Vice President',
    1,
    2
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Secretary',
    'Student Representative Council Secretary',
    1,
    3
  );

-- ── Candidates ───────────────────────────────────────────────────
INSERT INTO candidates (id, election_id, position_id, full_name, bio, sort_order)
VALUES
  -- President candidates
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Kwame Mensah',
    'Third year student passionate about student welfare',
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Abena Asante',
    'Committed to improving academic resources for all students',
    2
  ),
  -- Vice President candidates
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Kofi Boateng',
    'Focused on student engagement and campus activities',
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Ama Owusu',
    'Dedicated to bridging the gap between students and faculty',
    2
  ),
  -- Secretary candidates
  (
    'c0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'Yaw Darko',
    'Detail-oriented and committed to transparent communication',
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    'Akosua Frimpong',
    'Passionate about keeping students informed and involved',
    2
  );

-- ── Test voters ──────────────────────────────────────────────────
-- These are test accounts only
-- To wipe: DELETE FROM voter_eligibility WHERE election_id = 'a0000000-0000-0000-0000-000000000001';
INSERT INTO voter_eligibility (
  election_id,
  student_id,
  school_email,
  full_name,
  department,
  level,
  eligible
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '10305844',
    '10305844@upsamail.edu.gh',
    'Emmanuel (Test Student 1)',
    'Business & Commerce',
    '300',
    true
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    '10348270',
    '10348270@upsamail.edu.gh',
    'Friend Test Account',
    'Business & Commerce',
    '300',
    true
  );