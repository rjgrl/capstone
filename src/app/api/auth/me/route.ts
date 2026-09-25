import { NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/api";

export async function GET() {
  try {
    const auth = await requireAuth();
    return NextResponse.json({
      user: auth.user,
      permissions: [...auth.permissions],
    });
  } catch (error) {
    return jsonError(error);
  }
}
