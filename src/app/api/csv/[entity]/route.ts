import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { isDepartmentHead, isSuperAdmin } from "@/lib/auth";
import { CHECKLIST_TYPE, PROJECT_STATUS, RANKS, ROLE_KEYS } from "@/lib/constants";
import { csvResponse, headerIndex, parseCsv, toCsv } from "@/lib/csv";
import { passwordSchema } from "@/lib/validators";
import { assertResearcherMayStart, projectScopeWhere } from "@/lib/workflow";
import { facultyName } from "@/lib/constants";

type Context = { params: Promise<{ entity: string }> };

const ENTITIES = ["departments", "programs", "faculty", "projects", "users"] as const;
type Entity = (typeof ENTITIES)[number];

function asEntity(value: string): Entity {
  if (!ENTITIES.includes(value as Entity)) {
    throw new ApiError(404, "That CSV export is not available.");
  }
  return value as Entity;
}

export async function GET(_request: Request, context: Context) {
  try {
    const auth = await requirePermission("csv.exchange");
    const { entity } = await context.params;
    const name = asEntity(entity);
    if (!isSuperAdmin(auth) && name !== "projects" && name !== "faculty") {
      throw new ApiError(403, "You can export research projects and faculty records for your department.");
    }

    if (name === "departments") {
      const rows = await prisma.department.findMany({ orderBy: { name: "asc" } });
      return csvResponse(
        "departments.csv",
        toCsv([["name", "code"], ...rows.map((row) => [row.name, row.code])]),
      );
    }
    if (name === "programs") {
      const rows = await prisma.program.findMany({ include: { department: true }, orderBy: { name: "asc" } });
      return csvResponse(
        "programs.csv",
        toCsv([["name", "departmentCode"], ...rows.map((row) => [row.name, row.department.code])]),
      );
    }
    if (name === "faculty") {
      const where = isDepartmentHead(auth) ? { departmentId: auth.user.departmentId ?? "__none__" } : {};
      const rows = await prisma.faculty.findMany({
        where,
        include: { department: true, program: true },
        orderBy: { lastName: "asc" },
      });
      return csvResponse(
        "faculty.csv",
        toCsv([
          [
            "firstName",
            "middleName",
            "lastName",
            "rank",
            "departmentCode",
            "programName",
            "contactInformation",
            "mobileNumber",
            "institutionalEmail",
            "facebookAccount",
          ],
          ...rows.map((row) => [
            row.firstName,
            row.middleName ?? "",
            row.lastName,
            row.rank,
            row.department.code,
            row.program?.name ?? "",
            row.contactInformation ?? "",
            row.mobileNumber,
            row.institutionalEmail,
            row.facebookAccount ?? "",
          ]),
        ]),
      );
    }
    if (name === "projects") {
      const scope = await projectScopeWhere(auth);
      const rows = await prisma.researchProject.findMany({
        where: scope,
        include: { faculty: true, department: true, program: true, checklist: true, currentPhase: true },
        orderBy: { title: "asc" },
      });
      return csvResponse(
        "research-projects.csv",
        toCsv([
          ["title", "summary", "facultyEmail", "facultyName", "department", "program", "checklist", "status", "phase", "year"],
          ...rows.map((row) => [
            row.title,
            row.summary ?? "",
            row.faculty.institutionalEmail,
            facultyName(row.faculty),
            row.department.name,
            row.program?.name ?? "",
            row.checklist.name,
            row.status,
            row.currentPhase?.name ?? "",
            String(row.year),
          ]),
        ]),
      );
    }

    const rows = await prisma.user.findMany({
      include: { role: true, department: true, faculty: true },
      orderBy: { name: "asc" },
    });
    return csvResponse(
      "users.csv",
      toCsv([
        ["name", "email", "role", "departmentCode", "facultyEmail", "isActive"],
        ...rows.map((row) => [
          row.name,
          row.email,
          row.role.key,
          row.department?.code ?? "",
          row.faculty?.institutionalEmail ?? "",
          row.isActive ? "true" : "false",
        ]),
      ]),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const auth = await requirePermission("csv.exchange");
    if (!isSuperAdmin(auth)) {
      throw new ApiError(403, "Only a Super Admin can import CSV records.");
    }
    const { entity } = await context.params;
    const name = asEntity(entity);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a CSV file to import.");
    if (file.size > 2 * 1024 * 1024) throw new ApiError(400, "The CSV file must be 2 MB or smaller.");
    const text = await file.text();
    const { header, body } = parseCsv(text);
    let created = 0;

    if (name === "departments") {
      const nameIndex = headerIndex(header, "name");
      const codeIndex = headerIndex(header, "code");
      for (const [line, row] of body.entries()) {
        const departmentName = row[nameIndex];
        const code = row[codeIndex]?.toUpperCase();
        if (!departmentName || !code) throw new ApiError(400, `Row ${line + 2} is missing a name or code.`);
        await prisma.department.upsert({
          where: { code },
          update: { name: departmentName },
          create: { name: departmentName, code },
        });
        created += 1;
      }
    } else if (name === "programs") {
      const nameIndex = headerIndex(header, "name");
      const codeIndex = headerIndex(header, "departmentCode");
      for (const [line, row] of body.entries()) {
        const programName = row[nameIndex];
        const code = row[codeIndex]?.toUpperCase();
        const department = await prisma.department.findUnique({ where: { code } });
        if (!programName || !department) {
          throw new ApiError(400, `Row ${line + 2} needs a program name and a known department code.`);
        }
        await prisma.program.upsert({
          where: { departmentId_name: { departmentId: department.id, name: programName } },
          update: {},
          create: { name: programName, departmentId: department.id },
        });
        created += 1;
      }
    } else if (name === "faculty") {
      const columns = {
        firstName: headerIndex(header, "firstName"),
        middleName: headerIndex(header, "middleName"),
        lastName: headerIndex(header, "lastName"),
        rank: headerIndex(header, "rank"),
        departmentCode: headerIndex(header, "departmentCode"),
        programName: headerIndex(header, "programName"),
        contactInformation: headerIndex(header, "contactInformation"),
        mobileNumber: headerIndex(header, "mobileNumber"),
        institutionalEmail: headerIndex(header, "institutionalEmail"),
        facebookAccount: headerIndex(header, "facebookAccount"),
      };
      for (const [line, row] of body.entries()) {
        const email = row[columns.institutionalEmail]?.toLowerCase();
        const rank = row[columns.rank];
        if (!row[columns.firstName] || !row[columns.lastName] || !email || !row[columns.mobileNumber]) {
          throw new ApiError(400, `Row ${line + 2} is missing a name, email, or mobile number.`);
        }
        if (!RANKS.includes(rank as (typeof RANKS)[number])) {
          throw new ApiError(400, `Row ${line + 2} must use the rank Faculty or Professor.`);
        }
        const department = await prisma.department.findUnique({
          where: { code: row[columns.departmentCode]?.toUpperCase() },
        });
        if (!department) throw new ApiError(400, `Row ${line + 2} has an unknown department code.`);
        const programName = row[columns.programName];
        const program = programName
          ? await prisma.program.findUnique({
              where: { departmentId_name: { departmentId: department.id, name: programName } },
            })
          : null;
        if (programName && !program) throw new ApiError(400, `Row ${line + 2} has an unknown program.`);
        await prisma.faculty.upsert({
          where: { institutionalEmail: email },
          update: {
            firstName: row[columns.firstName],
            middleName: row[columns.middleName] || null,
            lastName: row[columns.lastName],
            rank,
            departmentId: department.id,
            programId: program?.id ?? null,
            contactInformation: row[columns.contactInformation] || null,
            mobileNumber: row[columns.mobileNumber],
            facebookAccount: row[columns.facebookAccount] || null,
          },
          create: {
            firstName: row[columns.firstName],
            middleName: row[columns.middleName] || null,
            lastName: row[columns.lastName],
            rank,
            departmentId: department.id,
            programId: program?.id ?? null,
            contactInformation: row[columns.contactInformation] || null,
            mobileNumber: row[columns.mobileNumber],
            institutionalEmail: email,
            facebookAccount: row[columns.facebookAccount] || null,
          },
        });
        created += 1;
      }
    } else if (name === "projects") {
      const titleIndex = headerIndex(header, "title");
      const summaryIndex = headerIndex(header, "summary");
      const emailIndex = headerIndex(header, "facultyEmail");
      const checklistIndex = headerIndex(header, "checklistType");
      const yearIndex = headerIndex(header, "year");
      for (const [line, row] of body.entries()) {
        const title = row[titleIndex];
        const email = row[emailIndex]?.toLowerCase();
        const checklistType = row[checklistIndex];
        const year = Number(row[yearIndex]);
        if (!title || !email) throw new ApiError(400, `Row ${line + 2} needs a title and faculty email.`);
        if (checklistType !== CHECKLIST_TYPE.STANDARD && checklistType !== CHECKLIST_TYPE.PERSONALLY_FUNDED) {
          throw new ApiError(400, `Row ${line + 2} checklistType must be STANDARD or PERSONALLY_FUNDED.`);
        }
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
          throw new ApiError(400, `Row ${line + 2} has an invalid year.`);
        }
        const faculty = await prisma.faculty.findUnique({ where: { institutionalEmail: email } });
        if (!faculty) throw new ApiError(400, `Row ${line + 2} does not match a Faculty / Professor profile.`);
        await assertResearcherMayStart(faculty.id);
        const checklist = await prisma.checklist.findUnique({
          where: { type: checklistType },
          include: { phases: { orderBy: { sequence: "asc" } } },
        });
        if (!checklist?.phases[0]) throw new ApiError(409, "The selected checklist has no phases.");
        await prisma.researchProject.create({
          data: {
            title,
            summary: row[summaryIndex] || null,
            facultyId: faculty.id,
            departmentId: faculty.departmentId,
            programId: faculty.programId,
            checklistId: checklist.id,
            status: PROJECT_STATUS.ONGOING,
            currentPhaseId: checklist.phases[0].id,
            year,
          },
        });
        created += 1;
      }
    } else {
      const columns = {
        name: headerIndex(header, "name"),
        email: headerIndex(header, "email"),
        password: headerIndex(header, "password"),
        role: headerIndex(header, "role"),
        departmentCode: headerIndex(header, "departmentCode"),
        facultyEmail: headerIndex(header, "facultyEmail"),
      };
      for (const [line, row] of body.entries()) {
        const email = row[columns.email]?.toLowerCase();
        const roleKey = row[columns.role];
        if (!row[columns.name] || !email || !row[columns.password]) {
          throw new ApiError(400, `Row ${line + 2} needs a name, email, and password.`);
        }
        if (!Object.values(ROLE_KEYS).includes(roleKey as (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS])) {
          throw new ApiError(400, `Row ${line + 2} has an unknown role.`);
        }
        passwordSchema.parse(row[columns.password]);
        const role = await prisma.role.findUnique({ where: { key: roleKey } });
        if (!role) throw new ApiError(400, `Row ${line + 2} has an unknown role.`);
        const department =
          roleKey === ROLE_KEYS.DEPARTMENT_HEAD
            ? await prisma.department.findUnique({ where: { code: row[columns.departmentCode]?.toUpperCase() } })
            : null;
        if (roleKey === ROLE_KEYS.DEPARTMENT_HEAD && !department) {
          throw new ApiError(400, `Row ${line + 2} needs a department code for the Department Head.`);
        }
        const faculty =
          roleKey === ROLE_KEYS.RESEARCHER
            ? await prisma.faculty.findUnique({
                where: { institutionalEmail: row[columns.facultyEmail]?.toLowerCase() },
              })
            : null;
        if (roleKey === ROLE_KEYS.RESEARCHER && (!faculty || faculty.institutionalEmail !== email)) {
          throw new ApiError(
            400,
            `Row ${line + 2} must use the Faculty / Professor institutional email and a matching facultyEmail.`,
          );
        }
        if (faculty?.userId) throw new ApiError(409, `Row ${line + 2} is already linked to a user account.`);
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new ApiError(409, `Row ${line + 2} uses an email that already has an account.`);
        await prisma.user.create({
          data: {
            name: row[columns.name],
            email,
            passwordHash: await bcrypt.hash(row[columns.password], 12),
            roleId: role.id,
            departmentId: department?.id ?? null,
            isActive: true,
            ...(faculty ? { faculty: { connect: { id: faculty.id } } } : {}),
          },
        });
        created += 1;
      }
    }

    return Response.json({ created });
  } catch (error) {
    return jsonError(error);
  }
}
