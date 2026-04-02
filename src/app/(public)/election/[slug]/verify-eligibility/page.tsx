import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function VerifyEligibilityPage({ params }: Props) {
  const { slug } = await params;
  // Hand off to the route handler which can set cookies
  redirect(`/api/auth/complete-google?slug=${slug}`);
}
