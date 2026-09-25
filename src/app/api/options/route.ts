import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { hasPermission, isDepartmentHead, isResearcher } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth();
    const canSeeDepartments =
      hasPermission(auth, "departments.manage") ||
      hasPermission(auth, "projects.view") ||
      hasPermission(auth, "search.projects") ||
      hasPermission(auth, "faculty.view") ||
      hasPermission(auth, "reports.generate") ||
      hasPermission(auth, "projects.create");
    if (!canSeeDepartments) {
      return NextResponse.json({ error: "You do not have permission to do that." }, { status: 403 });
    }

    const departmentWhere = isDepartmentHead(auth)
      ? { id: auth.user.departmentId ?? "__none__" }
      : isResearcher(auth)
        ? { faculty: { some: { id: auth.user.facultyId ?? "__none__" } } }
        : {};

    const [departments, programs, faculty, phases, checklists] = await Promise.all([
      prisma.department.findMany({ where: departmentWhere, orderBy: { name: "asc" } }),
      prisma.program.findMany({
        where: isDepartmentHead(auth)
          ? { departmentId: auth.user.departmentId ?? "__none__" }
          : isResearcher(auth)
            ? { faculty: { some: { id: auth.user.facultyId ?? "__none__" } } }
            : {},
        include: { department: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      hasPermission(auth, "search.researchers") || hasPermission(auth, "projects.create") || hasPermission(auth, "faculty.manage")
        ? prisma.faculty.findMany({
            where: isDepartmentHead(auth)
              ? { departmentId: auth.user.departmentId ?? "__none__" }
              : isResearcher(auth)
                ? { id: auth.user.facultyId ?? "__none__" }
                : {},
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            select: { id: true, firstName: true, lastName: true, departmentId: true, programId: true },
          })
        : Promise.resolve([]),
      prisma.phase.findMany({
        orderBy: [{ checklistId: "asc" }, { sequence: "asc" }],
        select: { id: true, name: true, sequence: true, checklist: { select: { name: true, type: true } } },
      }),
      prisma.checklist.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    ]);

    return NextResponse.json({ departments, programs, faculty, phases, checklists });
  } catch (error) {
    return jsonError(error);
  }
}
