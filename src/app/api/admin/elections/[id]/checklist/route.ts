import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const UUID = z.uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;
  if (!UUID.safeParse(electionId).success) {
    return NextResponse.json(
      { error: "Invalid election ID." },
      { status: 400 },
    );
  }

  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, status, start_time, end_time, results_visibility, session_verification_enabled, eligibility_check_enabled, eligibility_check_open_from, created_by",
    )
    .eq("id", electionId)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const { count: voterCount } = await supabaseServer
    .from("voter_eligibility")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId);

  const { count: positionCount } = await supabaseServer
    .from("positions")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId);

  const { data: positions } = await supabaseServer
    .from("positions")
    .select("id, name, candidates(id, is_no_vote)")
    .eq("election_id", electionId);

  const positionsWithCandidates = (positions || []).filter(
    (p) =>
      p.candidates &&
      p.candidates.filter((c: { is_no_vote: boolean }) => !c.is_no_vote)
        .length > 0,
  );

  const hasStartTime = !!election.start_time;
  const hasEndTime = !!election.end_time;
  const startInFuture = election.start_time
    ? new Date(election.start_time) > new Date()
    : false;
  const endAfterStart =
    election.start_time && election.end_time
      ? new Date(election.end_time) > new Date(election.start_time)
      : false;

  const checks = [
    {
      id: "has_voters",
      label: "Voter register uploaded",
      description: `${voterCount || 0} eligible voters in the register. Minimum 1 required.`,
      passed: (voterCount || 0) > 0,
      critical: true,
      action: (voterCount || 0) === 0 ? "Upload Voters" : null,
      action_path:
        (voterCount || 0) === 0
          ? `/admin/elections/${electionId}/voters`
          : null,
    },
    {
      id: "has_positions",
      label: "Positions created",
      description: `${positionCount || 0} position(s) created. Minimum 1 required.`,
      passed: (positionCount || 0) > 0,
      critical: true,
      action: (positionCount || 0) === 0 ? "Add Positions" : null,
      action_path:
        (positionCount || 0) === 0
          ? `/admin/elections/${electionId}/candidates`
          : null,
    },
    {
      id: "positions_have_candidates",
      label: "All positions have candidates",
      description: `${positionsWithCandidates.length} of ${positionCount || 0} positions have at least one candidate.`,
      passed:
        (positionCount || 0) > 0 &&
        positionsWithCandidates.length === (positionCount || 0),
      critical: true,
      action:
        positionsWithCandidates.length < (positionCount || 0)
          ? "Add Candidates"
          : null,
      action_path:
        positionsWithCandidates.length < (positionCount || 0)
          ? `/admin/elections/${electionId}/candidates`
          : null,
    },
    {
      id: "has_start_time",
      label: "Start time set",
      description: election.start_time
        ? `Election starts: ${new Date(election.start_time).toLocaleString("en-GH", { timeZone: "Africa/Accra", hour12: true })}`
        : "No start time set.",
      passed: hasStartTime,
      critical: true,
      action: !hasStartTime ? "Set Time" : null,
      action_path: !hasStartTime ? `/admin/elections/${electionId}` : null,
    },
    {
      id: "has_end_time",
      label: "End time set",
      description: election.end_time
        ? `Election ends: ${new Date(election.end_time).toLocaleString("en-GH", { timeZone: "Africa/Accra", hour12: true })}`
        : "No end time set.",
      passed: hasEndTime,
      critical: true,
      action: !hasEndTime ? "Set Time" : null,
      action_path: !hasEndTime ? `/admin/elections/${electionId}` : null,
    },
    {
      id: "start_in_future",
      label: "Start time is in the future",
      description: startInFuture
        ? "Election has not started yet."
        : election.status === "active"
          ? "Election is currently active."
          : "Start time is in the past.",
      passed:
        startInFuture ||
        election.status === "active" ||
        election.status === "scheduled",
      critical: true,
      action: null,
      action_path: null,
    },
    {
      id: "end_after_start",
      label: "End time is after start time",
      description: endAfterStart
        ? "Time window is valid."
        : "End time must be after start time.",
      passed: endAfterStart,
      critical: true,
      action: !endAfterStart && hasStartTime && hasEndTime ? "Fix Times" : null,
      action_path:
        !endAfterStart && hasStartTime && hasEndTime
          ? `/admin/elections/${electionId}`
          : null,
    },
    {
      id: "status_ready",
      label: "Election status is scheduled or active",
      description: `Current status: ${election.status}. Must be scheduled or active to accept votes.`,
      passed: ["scheduled", "active"].includes(election.status),
      critical: true,
      action: election.status === "draft" ? "Schedule Election" : null,
      action_path:
        election.status === "draft" ? `/admin/elections/${electionId}` : null,
    },
    {
      id: "sufficient_voters",
      label: "Sufficient voters uploaded",
      description: `${voterCount || 0} voters. Recommended minimum is 100 for a meaningful election.`,
      passed: (voterCount || 0) >= 100,
      critical: false,
      action: null,
      action_path: null,
    },
    {
      id: "results_visibility",
      label: "Results visibility configured",
      description: election.results_visibility
        ? `Results set to: ${election.results_visibility.replace(/_/g, " ")}`
        : "Results visibility not configured.",
      passed: !!election.results_visibility,
      critical: false,
      action: !election.results_visibility ? "Configure" : null,
      action_path: !election.results_visibility
        ? `/admin/elections/${electionId}`
        : null,
    },
    {
      id: "session_verification",
      label: "Session verification configured",
      description: election.session_verification_enabled
        ? "Session verification is enabled — students must select their session."
        : "Session verification is disabled — all sessions can vote.",
      passed: true,
      critical: false,
      action: null,
      action_path: null,
    },
  ];

  const criticalIssues = checks.filter((c) => c.critical && !c.passed).length;
  const warnings = checks.filter((c) => !c.critical && !c.passed).length;

  return NextResponse.json({
    checks,
    summary: {
      critical_issues: criticalIssues,
      warnings,
      all_critical_passed: criticalIssues === 0,
      ready_to_open: criticalIssues === 0,
    },
  });
}
