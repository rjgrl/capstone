import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth, requirePermission } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { facultySchema } from "@/lib/validators";
import { PROJECT_STATUS } from "@/lib/constants";
import { canViewProject, facultyScopeWhere, phaseCompletion } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET(_request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    if (!hasPermission(auth, "faculty.view") && !hasPermission(auth, "faculty.manage")) {
      throw new ApiError(403, "You do not have permission to do that.");
    }
    const { id } = await context.params;
    const scope = await facultyScopeWhere(auth);
    const faculty = await prisma.faculty.findFirst({
      where: { id, AND: [scope] },
      include: {
        department: true,
        program: true,
        user: { select: { id: true, name: true, email: true, isActive: true, role: { select: { name: true } } } },
        projects: {
          include: {
            department: true,
            program: true,
            checklist: true,
            currentPhase: true,
          },
          orderBy: [{ status: "asc" }, { year: "desc" }],
        },
      },
    });
    if (!faculty) throw new ApiError(404, "The faculty or professor profile could not be found.");

    const projects = [];
    for (const project of faculty.projects) {
      const completion = project.currentPhaseId
        ? await phaseCompletion(project.id, project.currentPhaseId)
        : null;
      projects.push({
        ...project,
        phaseName: project.currentPhase?.name ?? null,
        phaseDescription: project.currentPhase?.description ?? null,
        phaseComplete: project.status === PROJECT_STATUS.FINISHED ? true : Boolean(completion?.isComplete),
        missingCount: completion?.missingCount ?? 0,
        canOpen: canViewProject(auth, project),
      });
    }

    return NextResponse.json({
      faculty: { ...faculty, projects },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePermission("faculty.manage");
    const { id } = await context.params;
    const body = facultySchema.parse(await request.json());
    if (body.programId) {
      const program = await prisma.program.findUnique({ where: { id: body.programId } });
      if (!program || program.departmentId !== body.departmentId) {
        throw new ApiError(400, "Select a program that belongs to the chosen department.");
      }
    }
    const faculty = await prisma.faculty.update({
      where: { id },
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
    return NextResponse.json({ faculty });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requirePermission("faculty.manage");
    const { id } = await context.params;
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!faculty) throw new ApiError(404, "The faculty or professor profile could not be found.");
    if (faculty._count.projects) {
      throw new ApiError(409, "This faculty or professor still has research projects and cannot be deleted.");
    }
    await prisma.faculty.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
