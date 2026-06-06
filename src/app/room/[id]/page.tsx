import { RoomClient } from "@/components/RoomClient";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { id } = await params;
  const { invite } = await searchParams;
  return <RoomClient roomId={id} inviteToken={invite} />;
}
