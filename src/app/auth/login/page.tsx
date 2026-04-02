import { redirect } from "next/navigation";

export default function AuthLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  // Extract election slug from callbackUrl if present
  const callbackUrl = searchParams.callbackUrl || "";
  const slugMatch = callbackUrl.match(/election\/([^/]+)/);
  const slug = slugMatch ? slugMatch[1] : null;

  if (slug) {
    redirect(
      `/election/${slug}/login?error=${searchParams.error || "auth_failed"}`,
    );
  }

  redirect("/");
}
