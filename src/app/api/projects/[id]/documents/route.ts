import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth } from "@/lib/api";
import { assertSignature, assertPdfFile, savePdf } from "@/lib/files";
import { DOCUMENT_STATUS, PROJECT_STATUS } from "@/lib/constants";
import { assertCanViewProject, canUploadToProject, loadProject } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const project = await loadProject(id);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);
    if (!canUploadToProject(auth, project)) {
      throw new ApiError(403, "You cannot attach a file to this Research Project.");
    }
    if (project.status !== PROJECT_STATUS.ONGOING || !project.currentPhaseId) {
      throw new ApiError(409, "Files can be attached only while the Research Project is ongoing.");
    }

    const form = await request.formData();
    const checklistItemId = String(form.get("checklistItemId") || "");
    const signature = assertSignature(String(form.get("signature") || ""));
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Attach a PDF file.");
    const bytes = await assertPdfFile(file);

    const item = await prisma.checklistItem.findUnique({
      where: { id: checklistItemId },
      include: { phase: true },
    });
    if (!item || item.phaseId !== project.currentPhaseId || item.phase.checklistId !== project.checklistId) {
      throw new ApiError(400, "That documentary requirement is not part of the current phase.");
    }
    if (!item.requiresFile) {
      throw new ApiError(400, "This checklist line does not take a file.");
    }

    const latest = await prisma.projectDocument.findFirst({
      where: { projectId: project.id, checklistItemId: item.id },
      orderBy: { version: "desc" },
    });
    if (latest && (latest.status === DOCUMENT_STATUS.SUBMITTED || latest.status === DOCUMENT_STATUS.APPROVED)) {
      throw new ApiError(
        409,
        latest.status === DOCUMENT_STATUS.APPROVED
          ? "This documentary requirement is already approved."
          : "This file is waiting for review. Attach a new PDF only after a revision is requested or the file is rejected.",
      );
    }

    const storedPath = await savePdf(project.id, bytes, "submissions");
    const document = await prisma.projectDocument.create({
      data: {
        projectId: project.id,
        phaseId: item.phaseId,
        checklistItemId: item.id,
        version: (latest?.version ?? 0) + 1,
        originalName: file.name || "document.pdf",
        storedPath,
        fileSize: bytes.length,
        submittedById: auth.user.id,
        signatureData: signature,
        status: DOCUMENT_STATUS.SUBMITTED,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
