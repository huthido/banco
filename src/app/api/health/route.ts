import { NextResponse } from "next/server";

// Health check cho Coolify / load balancer. Trả nhanh 200, không phụ thuộc state.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
