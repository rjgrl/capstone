import { prisma } from "@/lib/db";
import { ApiError, jsonError, requireAuth } from "@/lib/api";
import { hasPermission } from "@/lib/auth";
import { pdfResponse, readStoredPdf } from "@/lib/files";
import { assertCanViewProject, canViewProject } from "@/lib/workflow";

type Context = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const auth = await requireAuth();
  if (!hasPermission(auth, "documents.view")) {
    throw new ApiError(403, "You do not have permission to view this file.");
  }
  const document = await prisma.projectDocument.findUnique({
    where: { id },
    include: { project: true, reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!document) throw new ApiError(404, "The file could not be found.");
  if (!canViewProject(auth, document.project)) {
    assertCanViewProject(auth, document.project);
  }
  return document;
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const document = await authorize(id);
    const kind = new URL(request.url).searchParams.get("kind");
    const download = new URL(request.url).searchParams.get("download") === "1";
    if (kind === "revision") {
      const review = document.reviews.find((item) => item.revisedStoredPath);
      if (!review?.revisedStoredPath) throw new ApiError(404, "No revised file is attached to this submission.");
      const bytes = await readStoredPdf(review.revisedStoredPath);
      return pdfResponse(bytes, review.revisedOriginalName || "revised.pdf", download);
    }
    const bytes = await readStoredPdf(document.storedPath);
    return pdfResponse(bytes, document.originalName, download);
  } catch (error) {
    return jsonError(error);
  }
}
