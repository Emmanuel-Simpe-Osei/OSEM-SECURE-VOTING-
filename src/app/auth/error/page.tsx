import { redirect } from "next/navigation";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const callbackUrl = searchParams.callbackUrl || "";
  const slugMatch = callbackUrl.match(/election\/([^/]+)/);
  const slug = slugMatch ? slugMatch[1] : null;

  if (slug) {
    redirect(`/election/${slug}/login?error=auth_failed`);
  }

  redirect("/");
}
