import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { rm } from "fs/promises";
import path from "path";
import { PERMISSIONS, ROLE_DETAILS, ROLE_PERMISSIONS, ROLE_KEYS } from "../src/lib/constants";
import { PERSONALLY_FUNDED_CHECKLIST, STANDARD_CHECKLIST, type OfficialChecklist } from "../src/lib/official-checklists";

const prisma = new PrismaClient();
const PASSWORD = "Rdu-Admin-2026";

const departments = [
  ["College of Technology", "COT"],
  ["College of Nursing", "CON"],
  ["College of Education", "COED"],
  ["College of Arts and Sciences", "CAS"],
  ["College of Business", "COB"],
  ["College of Public Administration and Governance", "CPAG"],
  ["College of Medicine", "COM"],
] as const;

const programs: Record<string, string> = {
  COT: "Information Technology",
  CON: "Bachelor of Science in Nursing",
  COED: "Secondary Education",
  CAS: "Biology",
  COB: "Accountancy",
  CPAG: "Public Administration",
  COM: "Doctor of Medicine",
};

async function clear() {
  await prisma.emailNotice.deleteMany();
  await prisma.reviewAction.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.researchProject.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await rm(path.join(process.cwd(), "data", "uploads"), { recursive: true, force: true });
}

async function seedChecklist(type: "STANDARD" | "PERSONALLY_FUNDED", checklist: OfficialChecklist) {
  const created = await prisma.checklist.create({
    data: { type, name: checklist.name, description: checklist.description },
  });
  for (const [phaseIndex, phase] of checklist.phases.entries()) {
    const savedPhase = await prisma.phase.create({
      data: {
        checklistId: created.id,
        name: phase.name,
        description: phase.description,
        sequence: phaseIndex + 1,
      },
    });
    for (const [itemIndex, item] of phase.items.entries()) {
      await prisma.checklistItem.create({
        data: {
          phaseId: savedPhase.id,
          section: item.section,
          name: item.name,
          description: item.description ?? null,
          isRequired: item.requiresFile ? item.isRequired : false,
          requiresFile: item.requiresFile,
          sequence: itemIndex + 1,
        },
      });
    }
  }
  return created.id;
}

async function main() {
  await clear();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const [name, code] of departments) {
    const department = await prisma.department.create({ data: { name, code } });
    await prisma.program.create({ data: { name: programs[code], departmentId: department.id } });
  }

  const permissionRows = [];
  for (const permission of PERMISSIONS) {
    permissionRows.push(await prisma.permission.create({ data: permission }));
  }
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission.id]));

  const roleRows = [];
  for (const key of Object.values(ROLE_KEYS)) {
    const role = await prisma.role.create({ data: { key, ...ROLE_DETAILS[key] } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSIONS[key].map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissionByKey.get(permissionKey)!,
      })),
    });
    roleRows.push(role);
  }
  const roleByKey = new Map(roleRows.map((role) => [role.key, role.id]));

  const technology = await prisma.department.findUniqueOrThrow({ where: { code: "COT" } });
  const nursing = await prisma.department.findUniqueOrThrow({ where: { code: "CON" } });
  const technologyProgram = await prisma.program.findFirstOrThrow({ where: { departmentId: technology.id } });
  const nursingProgram = await prisma.program.findFirstOrThrow({ where: { departmentId: nursing.id } });

  await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "superadmin@rdu.local",
      passwordHash,
      roleId: roleByKey.get(ROLE_KEYS.SUPER_ADMIN)!,
    },
  });
  const head = await prisma.user.create({
    data: {
      name: "Elena Cruz",
      email: "head.technology@rdu.local",
      passwordHash,
      roleId: roleByKey.get(ROLE_KEYS.DEPARTMENT_HEAD)!,
      departmentId: technology.id,
    },
  });

  const maria = await prisma.faculty.create({
    data: {
      firstName: "Maria",
      middleName: "L.",
      lastName: "Santos",
      rank: "Professor",
      departmentId: technology.id,
      programId: technologyProgram.id,
      contactInformation: "Faculty room, College of Technology",
      mobileNumber: "09171234567",
      institutionalEmail: "maria.santos@rdu.local",
      facebookAccount: "maria.santos",
    },
  });
  const juan = await prisma.faculty.create({
    data: {
      firstName: "Juan",
      middleName: "R.",
      lastName: "Reyes",
      rank: "Faculty",
      departmentId: technology.id,
      programId: technologyProgram.id,
      contactInformation: "Faculty room, College of Technology",
      mobileNumber: "09179876543",
      institutionalEmail: "juan.reyes@rdu.local",
      facebookAccount: "juan.reyes",
    },
  });
  await prisma.faculty.create({
    data: {
      firstName: "Ana",
      lastName: "Dela Cruz",
      rank: "Professor",
      departmentId: nursing.id,
      programId: nursingProgram.id,
      contactInformation: "Faculty room, College of Nursing",
      mobileNumber: "09170001111",
      institutionalEmail: "ana.delacruz@rdu.local",
      facebookAccount: "ana.delacruz",
    },
  });

  const mariaUser = await prisma.user.create({
    data: {
      name: "Maria L. Santos",
      email: maria.institutionalEmail,
      passwordHash,
      roleId: roleByKey.get(ROLE_KEYS.RESEARCHER)!,
      faculty: { connect: { id: maria.id } },
    },
  });
  const juanUser = await prisma.user.create({
    data: {
      name: "Juan R. Reyes",
      email: juan.institutionalEmail,
      passwordHash,
      roleId: roleByKey.get(ROLE_KEYS.RESEARCHER)!,
      faculty: { connect: { id: juan.id } },
    },
  });

  const standardId = await seedChecklist("STANDARD", STANDARD_CHECKLIST);
  const fundedId = await seedChecklist("PERSONALLY_FUNDED", PERSONALLY_FUNDED_CHECKLIST);
  const standardFirst = await prisma.phase.findFirstOrThrow({
    where: { checklistId: standardId },
    orderBy: { sequence: "asc" },
  });
  const fundedFirst = await prisma.phase.findFirstOrThrow({
    where: { checklistId: fundedId },
    orderBy: { sequence: "asc" },
  });

  await prisma.researchProject.create({
    data: {
      title: "Community-Based Network Literacy Program",
      summary: "A study of introductory network literacy sessions for community learners.",
      facultyId: maria.id,
      departmentId: technology.id,
      programId: technologyProgram.id,
      checklistId: standardId,
      status: "ONGOING",
      currentPhaseId: standardFirst.id,
      year: 2026,
    },
  });

  await prisma.researchProject.create({
    data: {
      title: "Assessment of Laboratory Readiness",
      summary: "A personally-funded study of laboratory readiness in the College of Technology.",
      facultyId: juan.id,
      departmentId: technology.id,
      programId: technologyProgram.id,
      checklistId: fundedId,
      status: "ONGOING",
      currentPhaseId: fundedFirst.id,
      year: 2025,
    },
  });

  console.log("Seed complete.");
  console.log("Password for every sample account: " + PASSWORD);
  console.log("Super Admin: superadmin@rdu.local");
  console.log("Department Head: head.technology@rdu.local");
  console.log("Researcher: maria.santos@rdu.local");
  console.log("Researcher: juan.reyes@rdu.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
