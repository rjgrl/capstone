import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { AuthContext } from "@/lib/auth";
import { hasPermission, isDepartmentHead, isResearcher, isSuperAdmin } from "@/lib/auth";
import { DOCUMENT_STATUS, PROJECT_STATUS } from "@/lib/constants";

export type PhaseItemState = {
  id: string;
  name: string;
  description: string | null;
  section: string | null;
  isRequired: boolean;
  requiresFile: boolean;
  sequence: number;
  status: string;
  document: {
    id: string;
    version: number;
    originalName: string;
    fileSize: number;
    submittedAt: Date;
    submittedBy: { id: string; name: string };
    signatureData: string;
    status: string;
    reviews: {
      id: string;
      action: string;
      remarks: string | null;
      signatureData: string;
      revisedOriginalName: string | null;
      revisedStoredPath: string | null;
      createdAt: Date;
      reviewer: { id: string; name: string };
    }[];
  } | null;
};

export async function loadProject(projectId: string) {
  return prisma.researchProject.findUnique({
    where: { id: projectId },
    include: {
      faculty: true,
      department: true,
      program: true,
      checklist: true,
      currentPhase: true,
    },
  });
}

export function canViewProject(
  auth: AuthContext,
  project: { departmentId: string; facultyId: string },
) {
  if (!hasPermission(auth, "projects.view") && !hasPermission(auth, "projects.manage")) {
    return false;
  }
  if (isSuperAdmin(auth)) return true;
  if (isDepartmentHead(auth)) return project.departmentId === auth.user.departmentId;
  if (isResearcher(auth)) return project.facultyId === auth.user.facultyId;
  return false;
}

export function assertCanViewProject(
  auth: AuthContext,
  project: { departmentId: string; facultyId: string },
) {
  if (!canViewProject(auth, project)) {
    throw new ApiError(403, "You do not have access to this Research Project.");
  }
}

export async function phaseCompletion(projectId: string, phaseId: string) {
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: { items: { orderBy: { sequence: "asc" } } },
  });
  if (!phase) throw new ApiError(404, "The phase could not be found.");

  const documents = await prisma.projectDocument.findMany({
    where: { projectId, phaseId },
    include: {
      submittedBy: { select: { id: true, name: true } },
      reviews: {
        orderBy: { createdAt: "asc" },
        include: { reviewer: { select: { id: true, name: true } } },
      },
    },
    orderBy: { version: "desc" },
  });

  const latestByItem = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    const current = latestByItem.get(document.checklistItemId);
    if (!current || document.version > current.version) {
      latestByItem.set(document.checklistItemId, document);
    }
  }

  const items: PhaseItemState[] = phase.items.map((item) => {
    const document = latestByItem.get(item.id) ?? null;
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      section: item.section,
      isRequired: item.isRequired,
      requiresFile: item.requiresFile,
      sequence: item.sequence,
      status: document?.status ?? "MISSING",
      document: document
        ? {
            id: document.id,
            version: document.version,
            originalName: document.originalName,
            fileSize: document.fileSize,
            submittedAt: document.submittedAt,
            submittedBy: document.submittedBy,
            signatureData: document.signatureData,
            status: document.status,
            reviews: document.reviews,
          }
        : null,
    };
  });

  const required = items.filter((item) => item.isRequired && item.requiresFile);
  const isComplete = required.every((item) => item.status === DOCUMENT_STATUS.APPROVED);
  const missingCount = required.filter((item) => item.status !== DOCUMENT_STATUS.APPROVED).length;

  return { phase, items, isComplete, missingCount };
}

export async function incompleteProjectForFaculty(facultyId: string, exceptProjectId?: string) {
  const projects = await prisma.researchProject.findMany({
    where: {
      facultyId,
      status: PROJECT_STATUS.ONGOING,
      ...(exceptProjectId ? { id: { not: exceptProjectId } } : {}),
    },
    include: { currentPhase: true },
  });

  for (const project of projects) {
    if (!project.currentPhaseId) {
      return project;
    }
    const completion = await phaseCompletion(project.id, project.currentPhaseId);
    if (!completion.isComplete) return project;
  }
  return null;
}

export async function assertResearcherMayStart(facultyId: string) {
  const blocking = await incompleteProjectForFaculty(facultyId);
  if (blocking) {
    throw new ApiError(
      409,
      `A new Research Project cannot be started while "${blocking.title}" still has an incomplete phase. Finish the missing documents and wait for the Department Head to approve that phase.`,
    );
  }
}

export function canUploadToProject(
  auth: AuthContext,
  project: { departmentId: string; facultyId: string; status: string },
) {
  if (!hasPermission(auth, "documents.upload")) return false;
  if (project.status !== PROJECT_STATUS.ONGOING) return false;
  if (isSuperAdmin(auth)) return true;
  if (isResearcher(auth)) return project.facultyId === auth.user.facultyId;
  if (isDepartmentHead(auth)) return project.departmentId === auth.user.departmentId;
  return false;
}

export function canReviewProject(
  auth: AuthContext,
  project: { departmentId: string; facultyId: string; status: string },
) {
  if (!hasPermission(auth, "documents.review")) return false;
  if (project.status !== PROJECT_STATUS.ONGOING) return false;
  if (isSuperAdmin(auth)) return true;
  if (isDepartmentHead(auth)) return project.departmentId === auth.user.departmentId;
  return false;
}

export async function projectScopeWhere(auth: AuthContext) {
  if (isSuperAdmin(auth)) return {};
  if (isDepartmentHead(auth)) {
    if (!auth.user.departmentId) return { id: "__none__" };
    return { departmentId: auth.user.departmentId };
  }
  if (isResearcher(auth)) {
    if (!auth.user.facultyId) return { id: "__none__" };
    return { facultyId: auth.user.facultyId };
  }
  return { id: "__none__" };
}

export async function facultyScopeWhere(auth: AuthContext) {
  if (isSuperAdmin(auth)) return {};
  if (isDepartmentHead(auth)) {
    if (!auth.user.departmentId) return { id: "__none__" };
    return { departmentId: auth.user.departmentId };
  }
  if (isResearcher(auth)) {
    if (!auth.user.facultyId) return { id: "__none__" };
    return { id: auth.user.facultyId };
  }
  return { id: "__none__" };
}
