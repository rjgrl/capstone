import { prisma } from "@/lib/db";
import { PROJECT_STATUS } from "@/lib/constants";
import type { AuthContext } from "@/lib/auth";
import { isDepartmentHead, isResearcher } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export function dashboardScope(auth: AuthContext): Prisma.ResearchProjectWhereInput {
  if (isDepartmentHead(auth)) {
    return { departmentId: auth.user.departmentId ?? "__none__" };
  }
  if (isResearcher(auth)) {
    return { facultyId: auth.user.facultyId ?? "__none__" };
  }
  return {};
}

export async function buildDashboard(auth: AuthContext, filters?: { year?: number; departmentId?: string }) {
  const scope = dashboardScope(auth);
  const where: Prisma.ResearchProjectWhereInput = { ...scope };
  if (filters?.year) where.year = filters.year;
  if (filters?.departmentId && !isDepartmentHead(auth) && !isResearcher(auth)) {
    where.departmentId = filters.departmentId;
  }

  const [ongoing, finished, projects, departments] = await Promise.all([
    prisma.researchProject.count({ where: { ...where, status: PROJECT_STATUS.ONGOING } }),
    prisma.researchProject.count({ where: { ...where, status: PROJECT_STATUS.FINISHED } }),
    prisma.researchProject.findMany({
      where,
      include: {
        faculty: true,
        department: true,
        program: true,
        currentPhase: true,
        checklist: true,
      },
      orderBy: [{ year: "desc" }, { title: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const years = await prisma.researchProject.findMany({
    where: scope,
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });

  const byYearMap = new Map<number, { year: number; ongoing: number; finished: number }>();
  const byDepartment = departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    ongoing: 0,
    finished: 0,
    total: 0,
  }));
  const departmentIndex = new Map(byDepartment.map((department) => [department.id, department]));

  for (const project of projects) {
    const yearRow = byYearMap.get(project.year) ?? { year: project.year, ongoing: 0, finished: 0 };
    if (project.status === PROJECT_STATUS.FINISHED) yearRow.finished += 1;
    else yearRow.ongoing += 1;
    byYearMap.set(project.year, yearRow);

    const departmentRow = departmentIndex.get(project.departmentId);
    if (departmentRow) {
      departmentRow.total += 1;
      if (project.status === PROJECT_STATUS.FINISHED) departmentRow.finished += 1;
      else departmentRow.ongoing += 1;
    }
  }

  return {
    ongoing,
    finished,
    total: ongoing + finished,
    byYear: [...byYearMap.values()].sort((a, b) => b.year - a.year),
    byDepartment: isResearcher(auth)
      ? []
      : isDepartmentHead(auth)
        ? byDepartment.filter((department) => department.id === auth.user.departmentId)
        : byDepartment,
    years: years.map((item) => item.year),
    projects,
  };
}
