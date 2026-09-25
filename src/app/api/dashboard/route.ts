import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/api";
import { buildDashboard } from "@/lib/reports";

export async function GET() {
  try {
    const auth = await requirePermission("dashboard.view");
    const dashboard = await buildDashboard(auth);
    return NextResponse.json({ dashboard });
  } catch (error) {
    return jsonError(error);
  }
}
