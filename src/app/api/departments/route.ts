import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requirePermission } from "@/lib/api";
import { departmentSchema } from "@/lib/validators";

export async function GET() {
  try {
    const auth = await requirePermission("departments.manage");
    void auth;
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { programs: true, faculty: true, projects: true, users: true } } },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("departments.manage");
    const body = departmentSchema.parse(await request.json());
    const department = await prisma.department.create({
      data: { name: body.name, code: body.code.toUpperCase() },
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
