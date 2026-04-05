import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const [electionRes, positionsRes, votersRes] = await Promise.all([
    supabaseServer
      .from("elections")
      .select("id, title, status, start_time, end_time, slug")
      .eq("id", id)
      .single(),

    supabaseServer
      .from("positions")
      .select(
        `
        id, name,
        candidates (id, full_name, photo_url)
      `,
      )
      .eq("election_id", id),

    supabaseServer
      .from("voter_eligibility")
      .select("id", { count: "exact", head: true })
      .eq("election_id", id),
  ]);

  if (!electionRes.data) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const election = electionRes.data;
  const positions = positionsRes.data || [];
  const voterCount = votersRes.count || 0;
  const now = new Date();
  const startTime = new Date(election.start_time);
  const endTime = new Date(election.end_time);

  // Count candidates and photos
  const totalCandidates = positions.reduce(
    (acc, p) => acc + (p.candidates?.length || 0),
    0,
  );
  const candidatesWithPhotos = positions.reduce(
    (acc, p) => acc + (p.candidates?.filter((c) => c.photo_url).length || 0),
    0,
  );
  const candidatesMissingPhotos = totalCandidates - candidatesWithPhotos;

  // Build checklist items
  const checks = [
    {
      id: "voters",
      label: "Voters registered",
      description:
        voterCount > 0
          ? `${voterCount.toLocaleString()} voters registered`
          : "No voters uploaded yet",
      passed: voterCount > 0,
      critical: true,
      action: voterCount === 0 ? "Upload voter list" : null,
      action_path: `/admin/elections/${id}/voters`,
    },
    {
      id: "positions",
      label: "Positions created",
      description:
        positions.length > 0
          ? `${positions.length} position${positions.length !== 1 ? "s" : ""} created`
          : "No positions added yet",
      passed: positions.length > 0,
      critical: true,
      action: positions.length === 0 ? "Add positions" : null,
      action_path: `/admin/elections/${id}/candidates`,
    },
    {
      id: "candidates",
      label: "Candidates added",
      description:
        totalCandidates > 0
          ? `${totalCandidates} candidate${totalCandidates !== 1 ? "s" : ""} across ${positions.length} position${positions.length !== 1 ? "s" : ""}`
          : "No candidates added yet",
      passed: totalCandidates > 0,
      critical: true,
      action: totalCandidates === 0 ? "Add candidates" : null,
      action_path: `/admin/elections/${id}/candidates`,
    },
    {
      id: "photos",
      label: "Candidate photos",
      description:
        candidatesMissingPhotos === 0 && totalCandidates > 0
          ? "All candidates have photos"
          : candidatesMissingPhotos > 0
            ? `${candidatesMissingPhotos} candidate${candidatesMissingPhotos !== 1 ? "s" : ""} missing photos`
            : "No candidates yet",
      passed: candidatesMissingPhotos === 0 && totalCandidates > 0,
      critical: false,
      action: candidatesMissingPhotos > 0 ? "Upload photos" : null,
      action_path: `/admin/elections/${id}/candidates`,
    },
    {
      id: "time_window",
      label: "Time window valid",
      description:
        endTime > startTime
          ? endTime > now
            ? `Voting ${startTime > now ? "opens" : "opened"} ${startTime.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, day: "numeric", month: "short" })}`
            : "End time is in the past — extend it"
          : "End time must be after start time",
      passed: endTime > startTime && endTime > now,
      critical: true,
      action: endTime <= startTime || endTime <= now ? "Fix time window" : null,
      action_path: null,
    },
    {
      id: "min_candidates",
      label: "Minimum candidates per position",
      description: positions.every((p) => (p.candidates?.length || 0) >= 2)
        ? "All positions have at least 2 candidates"
        : positions.some((p) => (p.candidates?.length || 0) < 2)
          ? `${positions.filter((p) => (p.candidates?.length || 0) < 2).length} position${positions.filter((p) => (p.candidates?.length || 0) < 2).length !== 1 ? "s" : ""} need more candidates`
          : "Add candidates first",
      passed:
        positions.length > 0 &&
        positions.every((p) => (p.candidates?.length || 0) >= 2),
      critical: false,
      action: null,
      action_path: `/admin/elections/${id}/candidates`,
    },
  ];

  const criticalIssues = checks.filter((c) => c.critical && !c.passed).length;
  const warnings = checks.filter((c) => !c.critical && !c.passed).length;
  const allCriticalPassed = criticalIssues === 0;

  return NextResponse.json({
    checks,
    summary: {
      critical_issues: criticalIssues,
      warnings,
      all_critical_passed: allCriticalPassed,
      ready_to_open: allCriticalPassed,
    },
  });
}
