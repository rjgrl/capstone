import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth, requirePermission } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { facultySchema } from "@/lib/validators";
import { facultyScopeWhere } from "@/lib/workflow";

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!hasPermission(auth, "faculty.view") && !hasPermission(auth, "faculty.manage") && !hasPermission(auth, "search.researchers")) {
      throw new ApiError(403, "You do not have permission to do that.");
    }
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const departmentId = params.get("departmentId") || undefined;
    const programId = params.get("programId") || undefined;
    const rank = params.get("rank") || undefined;
    const scope = await facultyScopeWhere(auth);

    const faculty = await prisma.faculty.findMany({
      where: {
        AND: [
          scope,
          departmentId ? { departmentId } : {},
          programId ? { programId } : {},
          rank ? { rank } : {},
          q
            ? {
                OR: [
                  { firstName: { contains: q } },
                  { middleName: { contains: q } },
                  { lastName: { contains: q } },
                  { institutionalEmail: { contains: q } },
                  { mobileNumber: { contains: q } },
                ],
              }
            : {},
        ],
      },
      include: {
        department: true,
        program: true,
        user: { select: { id: true, email: true, isActive: true, role: { select: { name: true, key: true } } } },
        _count: { select: { projects: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json({ faculty });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("faculty.manage");
    const body = facultySchema.parse(await request.json());
    if (body.programId) {
      const program = await prisma.program.findUnique({ where: { id: body.programId } });
      if (!program || program.departmentId !== body.departmentId) {
        throw new ApiError(400, "Select a program that belongs to the chosen department.");
      }
    }
    const faculty = await prisma.faculty.create({
      data: {
        firstName: body.firstName,
        middleName: emptyToNull(body.middleName),
        lastName: body.lastName,
        rank: body.rank,
        departmentId: body.departmentId,
        programId: emptyToNull(body.programId),
        contactInformation: emptyToNull(body.contactInformation),
        mobileNumber: body.mobileNumber,
        institutionalEmail: body.institutionalEmail.toLowerCase(),
        facebookAccount: emptyToNull(body.facebookAccount),
      },
    });
    return NextResponse.json({ faculty }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
