import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { PROJECT_STATUS, REVIEW_ACTION } from "@/lib/constants";
import { assertSignature, assertPdfFile, savePdf } from "@/lib/files";
import { sendResearcherNotice } from "@/lib/email";
import { assertCanViewProject, canReviewProject, loadProject } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

const ACTION_STATUS = {
  [REVIEW_ACTION.APPROVE]: "APPROVED",
  [REVIEW_ACTION.REQUEST_REVISION]: "REVISION_REQUESTED",
  [REVIEW_ACTION.REJECT]: "REJECTED",
} as const;

export async function POST(request: Request, context: Context) {
  try {
    const auth = await requireAuth();
    const { id } = await context.params;
    const document = await prisma.projectDocument.findUnique({
      where: { id },
      include: { checklistItem: true, phase: true, project: { include: { faculty: { include: { user: true } } } } },
    });
    if (!document) throw new ApiError(404, "The file could not be found.");
    const project = await loadProject(document.projectId);
    if (!project) throw new ApiError(404, "The Research Project could not be found.");
    assertCanViewProject(auth, project);
    if (!canReviewProject(auth, project)) {
      throw new ApiError(403, "You cannot review files for this Research Project.");
    }
    if (project.status !== PROJECT_STATUS.ONGOING || document.phaseId !== project.currentPhaseId) {
      throw new ApiError(409, "Only files in the current phase of an ongoing Research Project can be reviewed.");
    }
    if (document.status !== "SUBMITTED") {
      throw new ApiError(409, "This file is not waiting for review.");
    }

    const latest = await prisma.projectDocument.findFirst({
      where: { projectId: document.projectId, checklistItemId: document.checklistItemId },
      orderBy: { version: "desc" },
    });
    if (!latest || latest.id !== document.id) {
      throw new ApiError(409, "Review the latest file submitted for this documentary requirement.");
    }

    const form = await request.formData();
    const action = String(form.get("action") || "");
    if (!(action in ACTION_STATUS)) {
      throw new ApiError(400, "Choose Approve, Request Revision, or Reject.");
    }
    const remarks = String(form.get("remarks") || "").trim();
    const signature = assertSignature(String(form.get("signature") || ""));
    if (action !== REVIEW_ACTION.APPROVE && !remarks) {
      throw new ApiError(400, "Enter remarks that explain this decision.");
    }
    if (remarks.length > 2000) throw new ApiError(400, "Remarks are too long.");

    let revisedOriginalName: string | null = null;
    let revisedStoredPath: string | null = null;
    if (action === REVIEW_ACTION.REQUEST_REVISION) {
      if (!hasPermission(auth, "documents.attach_revision")) {
        throw new ApiError(403, "You cannot attach a revised file.");
      }
      const file = form.get("file");
      if (!(file instanceof File)) {
        throw new ApiError(400, "Attach the revised PDF when you request a revision.");
      }
      const bytes = await assertPdfFile(file);
      revisedStoredPath = await savePdf(project.id, bytes, "revisions");
      revisedOriginalName = file.name || "revised.pdf";
    }

    const review = await prisma.reviewAction.create({
      data: {
        documentId: document.id,
        projectId: project.id,
        reviewerId: auth.user.id,
        action,
        remarks: remarks || null,
        signatureData: signature,
        revisedOriginalName,
        revisedStoredPath,
      },
    });
    await prisma.projectDocument.update({
      where: { id: document.id },
      data: { status: ACTION_STATUS[action as keyof typeof ACTION_STATUS] },
    });

    const researcher = document.project.faculty.user;
    if (researcher) {
      const decision =
        action === REVIEW_ACTION.APPROVE
          ? "approved"
          : action === REVIEW_ACTION.REQUEST_REVISION
            ? "returned for revision"
            : "rejected";
      const subject = `Research Project ${decision}: ${project.title}`;
      const body = [
        `Hello ${researcher.name},`,
        "",
        `${auth.user.name} ${decision} a file on your Research Project "${project.title}".`,
        `Phase: ${document.phase.name}`,
        `Documentary requirement: ${document.checklistItem.name}`,
        `Decision: ${decision[0].toUpperCase()}${decision.slice(1)}`,
        remarks ? `Remarks: ${remarks}` : "",
        action === REVIEW_ACTION.REQUEST_REVISION
          ? "A revised file was attached. Sign in to the Research and Development Unit, open the Research Project, and submit a corrected PDF with your e-signature."
          : action === REVIEW_ACTION.REJECT
            ? "The file does not match the documentary checklist. Sign in and submit the correct PDF for this requirement."
            : "Sign in to the Research and Development Unit to see whether the phase can advance.",
        "",
        "Research and Development Unit",
      ]
        .filter(Boolean)
        .join("\n");
      await sendResearcherNotice({
        recipientUserId: researcher.id,
        recipientEmail: document.project.faculty.institutionalEmail,
        projectId: project.id,
        subject,
        body,
      });
    }

    return NextResponse.json({ review });
  } catch (error) {
    return jsonError(error);
  }
}
