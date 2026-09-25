import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth } from "@/lib/api";
import { hasPermission, isResearcher, isSuperAdmin } from "@/lib/auth";
import { PROJECT_STATUS } from "@/lib/constants";
import { assertCanViewProject, loadProject, phaseCompletion } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const project = await loadProject(id);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);
    const allowed =
      (isSuperAdmin(auth) && (hasPermission(auth, "projects.manage") || hasPermission(auth, "projects.create"))) ||
      (isResearcher(auth) && project.facultyId === auth.user.facultyId && hasPermission(auth, "projects.create"));
    if (!allowed) throw new ApiError(403, "You cannot mark this Research Project as Finished.");
    if (project.status !== PROJECT_STATUS.ONGOING || !project.currentPhaseId) {
      throw new ApiError(409, "This Research Project is already finished.");
    }
    const phases = await prisma.phase.findMany({
      where: { checklistId: project.checklistId },
      orderBy: { sequence: "asc" },
    });
    const last = phases[phases.length - 1];
    if (!last || last.id !== project.currentPhaseId) {
      throw new ApiError(409, "Finish the earlier phases before marking this Research Project as Finished.");
    }
    const completion = await phaseCompletion(project.id, project.currentPhaseId);
    if (!completion.isComplete) {
      throw new ApiError(
        409,
        "The current phase is still incomplete. The Department Head must approve every required document first.",
      );
    }
    const updated = await prisma.researchProject.update({
      where: { id: project.id },
      data: { status: PROJECT_STATUS.FINISHED, finishedAt: new Date() },
    });
    return NextResponse.json({ project: updated });
  } catch (error) {
    return jsonError(error);
  }
}
