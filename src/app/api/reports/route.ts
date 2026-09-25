import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/api";
import { isDepartmentHead, isResearcher } from "@/lib/auth";
import { buildDashboard } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission("reports.generate");
    if (isResearcher(auth)) {
      return NextResponse.json({ error: "You do not have permission to generate a report." }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const year = params.get("year");
    const departmentId = params.get("departmentId") || undefined;
    const report = await buildDashboard(auth, {
      year: year ? Number(year) : undefined,
      departmentId: isDepartmentHead(auth) ? auth.user.departmentId ?? undefined : departmentId,
    });
    return NextResponse.json({ report });
  } catch (error) {
    return jsonError(error);
  }
}
