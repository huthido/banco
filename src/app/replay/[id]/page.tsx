import { ReplayClient } from "@/components/ReplayClient";

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReplayClient recordId={decodeURIComponent(id)} />;
}
