import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, assertPermission, jsonError, requireAuth } from "@/lib/api";
import { hasPermission, isResearcher, isSuperAdmin } from "@/lib/auth";
import { projectSchema } from "@/lib/validators";
import { assertResearcherMayStart, phaseCompletion, projectScopeWhere } from "@/lib/workflow";
import { PROJECT_STATUS } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!hasPermission(auth, "projects.view") && !hasPermission(auth, "search.projects")) {
      throw new ApiError(403, "You do not have permission to do that.");
    }
    const params = new URL(request.url).searchParams;
    const q = params.get("q")?.trim();
    const departmentId = params.get("departmentId") || undefined;
    const programId = params.get("programId") || undefined;
    const facultyId = params.get("facultyId") || undefined;
    const status = params.get("status") || undefined;
    const phaseId = params.get("phaseId") || undefined;
    const year = params.get("year");
    const checklistType = params.get("checklistType") || undefined;
    const reviewStatus = params.get("reviewStatus") || undefined;
    const scope = await projectScopeWhere(auth);

    const projects = await prisma.researchProject.findMany({
      where: {
        AND: [
          scope,
          departmentId ? { departmentId } : {},
          programId ? { programId } : {},
          facultyId ? { facultyId } : {},
          status ? { status } : {},
          phaseId ? { currentPhaseId: phaseId } : {},
          year ? { year: Number(year) } : {},
          checklistType ? { checklist: { type: checklistType } } : {},
          q
            ? {
                OR: [
                  { title: { contains: q } },
                  { summary: { contains: q } },
                  { faculty: { firstName: { contains: q } } },
                  { faculty: { lastName: { contains: q } } },
                ],
              }
            : {},
        ],
      },
      include: {
        faculty: true,
        department: true,
        program: true,
        checklist: true,
        currentPhase: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    let visible = projects;
    if (reviewStatus) {
      const documents = await prisma.projectDocument.findMany({
        where: { projectId: { in: projects.map((project) => project.id) } },
        orderBy: { version: "desc" },
      });
      const latest = new Map<string, (typeof documents)[number]>();
      for (const document of documents) {
        const key = `${document.projectId}:${document.checklistItemId}`;
        if (!latest.has(key)) latest.set(key, document);
      }
      const matching = new Set(
        [...latest.values()].filter((document) => document.status === reviewStatus).map((document) => document.projectId),
      );
      visible = projects.filter((project) => matching.has(project.id));
    }

    const enriched = [];
    for (const project of visible) {
      const completion =
        project.status === PROJECT_STATUS.ONGOING && project.currentPhaseId
          ? await phaseCompletion(project.id, project.currentPhaseId)
          : null;
      enriched.push({
        ...project,
        currentPhaseComplete: project.status === PROJECT_STATUS.FINISHED ? true : Boolean(completion?.isComplete),
        missingCount: completion?.missingCount ?? 0,
      });
    }

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    assertPermission(auth, "projects.create");
    const body = projectSchema.parse(await request.json());
    const facultyId = isResearcher(auth) ? auth.user.facultyId : body.facultyId;
    if (!facultyId) {
      throw new ApiError(400, "Select the Faculty / Professor who will conduct this research.");
    }
    if (isResearcher(auth) && facultyId !== auth.user.facultyId) {
      throw new ApiError(403, "A Researcher can open a Research Project only for their own profile.");
    }
    if (!isSuperAdmin(auth) && !isResearcher(auth)) {
      throw new ApiError(403, "You do not have permission to open a Research Project.");
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: { department: true, program: true },
    });
    if (!faculty) throw new ApiError(400, "The Faculty / Professor profile could not be found.");

    await assertResearcherMayStart(faculty.id);

    const checklist = await prisma.checklist.findUnique({
      where: { type: body.checklistType },
      include: { phases: { orderBy: { sequence: "asc" }, include: { items: true } } },
    });
    if (!checklist || checklist.phases.length === 0) {
      throw new ApiError(
        409,
        "This documentary checklist has no phases yet. A Super Admin must maintain the checklist before a Research Project can start.",
      );
    }
    const firstPhase = checklist.phases[0];
    if (firstPhase.items.filter((item) => item.isRequired && item.requiresFile).length === 0) {
      throw new ApiError(409, "The first phase has no required documents. Update the checklist before starting.");
    }

    const project = await prisma.researchProject.create({
      data: {
        title: body.title,
        summary: body.summary?.trim() || null,
        facultyId: faculty.id,
        departmentId: faculty.departmentId,
        programId: faculty.programId,
        checklistId: checklist.id,
        status: PROJECT_STATUS.ONGOING,
        currentPhaseId: firstPhase.id,
        year: body.year,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
