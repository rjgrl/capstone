import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, assertPermission, jsonError, requireAuth } from "@/lib/api";
import { hasPermission, isResearcher, isSuperAdmin } from "@/lib/auth";
import { projectUpdateSchema } from "@/lib/validators";
import { PROJECT_STATUS, ROLE_KEYS } from "@/lib/constants";
import {
  assertCanViewProject,
  canReviewProject,
  canUploadToProject,
  loadProject,
  phaseCompletion,
} from "@/lib/workflow";
import { removeProjectFiles } from "@/lib/files";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const project = await loadProject(id);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);

    const phases = await prisma.phase.findMany({
      where: { checklistId: project.checklistId },
      orderBy: { sequence: "asc" },
    });

    const phaseViews = [];
    for (const phase of phases) {
      const completion = await phaseCompletion(project.id, phase.id);
      const isCurrent = project.currentPhaseId === phase.id && project.status === PROJECT_STATUS.ONGOING;
      const isPast =
        project.status === PROJECT_STATUS.FINISHED ||
        (project.currentPhase && phase.sequence < project.currentPhase.sequence);
      phaseViews.push({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        sequence: phase.sequence,
        state: isCurrent ? "current" : isPast ? "completed" : "pending",
        isComplete: completion.isComplete,
        missingCount: completion.missingCount,
        items: completion.items,
      });
    }

    const reviewers = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { key: ROLE_KEYS.DEPARTMENT_HEAD }, departmentId: project.departmentId },
          { role: { key: ROLE_KEYS.SUPER_ADMIN } },
        ],
      },
      select: { id: true, name: true, role: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    const current = phaseViews.find((phase) => phase.state === "current");
    const currentIndex = phases.findIndex((phase) => phase.id === project.currentPhaseId);
    const hasNext = currentIndex >= 0 && currentIndex < phases.length - 1;
    const isLast = currentIndex === phases.length - 1;

    return NextResponse.json({
      project,
      phases: phaseViews,
      reviewers,
      actions: {
        canUpload: canUploadToProject(auth, project),
        canReview: canReviewProject(auth, project),
        canAttachRevision: canReviewProject(auth, project) && hasPermission(auth, "documents.attach_revision"),
        canAdvance:
          project.status === PROJECT_STATUS.ONGOING &&
          Boolean(current?.isComplete) &&
          hasNext &&
          (isResearcher(auth) ? project.facultyId === auth.user.facultyId : isSuperAdmin(auth)) &&
          (hasPermission(auth, "projects.create") || hasPermission(auth, "projects.manage")),
        canFinish:
          project.status === PROJECT_STATUS.ONGOING &&
          Boolean(current?.isComplete) &&
          isLast &&
          (isResearcher(auth) ? project.facultyId === auth.user.facultyId : isSuperAdmin(auth)) &&
          (hasPermission(auth, "projects.create") || hasPermission(auth, "projects.manage")),
        canEdit:
          project.status === PROJECT_STATUS.ONGOING &&
          (isSuperAdmin(auth)
            ? hasPermission(auth, "projects.manage")
            : isResearcher(auth) &&
              project.facultyId === auth.user.facultyId &&
              hasPermission(auth, "projects.create")),
        canDelete: isSuperAdmin(auth) && hasPermission(auth, "projects.manage"),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const project = await loadProject(id);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);
    const allowed =
      (isSuperAdmin(auth) && hasPermission(auth, "projects.manage")) ||
      (isResearcher(auth) &&
        project.facultyId === auth.user.facultyId &&
        hasPermission(auth, "projects.create"));
    if (!allowed) throw new ApiError(403, "You do not have permission to update this Research Project.");
    if (project.status !== PROJECT_STATUS.ONGOING) {
      throw new ApiError(409, "A finished Research Project cannot be edited.");
    }
    const body = projectUpdateSchema.parse(await request.json());
    const updated = await prisma.researchProject.update({
      where: { id },
      data: {
        title: body.title,
        summary: body.summary?.trim() || null,
        year: body.year,
      },
    });
    return NextResponse.json({ project: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    assertPermission(auth, "projects.manage");
    if (!isSuperAdmin(auth)) throw new ApiError(403, "Only a Super Admin can delete a Research Project.");
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    await prisma.researchProject.delete({ where: { id } });
    await removeProjectFiles(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
