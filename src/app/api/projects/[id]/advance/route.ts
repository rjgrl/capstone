import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth } from "@/lib/api";
import { hasPermission, isResearcher, isSuperAdmin } from "@/lib/auth";
import { PROJECT_STATUS } from "@/lib/constants";
import { assertCanViewProject, loadProject, phaseCompletion } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

function canMove(auth: Awaited<ReturnType<typeof requireAuth>>, project: { facultyId: string }) {
  if (isSuperAdmin(auth)) return hasPermission(auth, "projects.manage") || hasPermission(auth, "projects.create");
  if (isResearcher(auth)) {
    return project.facultyId === auth.user.facultyId && hasPermission(auth, "projects.create");
  }
  return false;
}

export async function POST(_request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const project = await loadProject(id);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);
    if (!canMove(auth, project)) {
      throw new ApiError(403, "You cannot move this Research Project to the next phase.");
    }
    if (project.status !== PROJECT_STATUS.ONGOING || !project.currentPhaseId || !project.currentPhase) {
      throw new ApiError(409, "This Research Project is not on an active phase.");
    }
    const completion = await phaseCompletion(project.id, project.currentPhaseId);
    if (!completion.isComplete) {
      throw new ApiError(
        409,
        "The current phase is still incomplete. Provide every missing document and wait for the Department Head to approve the phase.",
      );
    }
    const phases = await prisma.phase.findMany({
      where: { checklistId: project.checklistId },
      orderBy: { sequence: "asc" },
    });
    const index = phases.findIndex((phase) => phase.id === project.currentPhaseId);
    const next = phases[index + 1];
    if (!next) {
      throw new ApiError(409, "This is the final phase. Mark the Research Project as Finished after it is approved.");
    }
    const updated = await prisma.researchProject.update({
      where: { id: project.id },
      data: { currentPhaseId: next.id },
    });
    return NextResponse.json({ project: updated });
  } catch (error) {
    return jsonError(error);
  }
}
