import { RoomClient } from "@/components/RoomClient";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string; join?: string }>;
}) {
  const { id } = await params;
  const { invite, join } = await searchParams;
  // `join=1` đến từ sảnh chờ công khai: xin ngồi vào ghế trống dù không có token.
  return <RoomClient roomId={id} inviteToken={invite} wantPlay={join === "1"} />;
}
