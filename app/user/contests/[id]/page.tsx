import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { ContestParticipantPage } from "@/modules/contest/participant-page";

export default async function UserContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (user.role === "Teacher") redirect(`/teacher/contests/${id}`);

  return <ContestParticipantPage params={Promise.resolve({ id })} searchParams={searchParams} />;
}
