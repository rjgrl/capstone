import { PrismaClient } from "@prisma/client";
import { rm } from "fs/promises";
import path from "path";
import {
  PERSONALLY_FUNDED_CHECKLIST,
  STANDARD_CHECKLIST,
  type OfficialChecklist,
} from "../src/lib/official-checklists";

const prisma = new PrismaClient();

async function install(checklistId: string, checklist: OfficialChecklist) {
  await prisma.checklist.update({
    where: { id: checklistId },
    data: { name: checklist.name, description: checklist.description },
  });
  let firstPhaseId = "";
  for (const [phaseIndex, phase] of checklist.phases.entries()) {
    const savedPhase = await prisma.phase.create({
      data: {
        checklistId,
        name: phase.name,
        description: phase.description,
        sequence: phaseIndex + 1,
      },
    });
    if (!firstPhaseId) firstPhaseId = savedPhase.id;
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
  return firstPhaseId;
}

async function main() {
  const projects = await prisma.researchProject.findMany({ select: { id: true } });
  await prisma.reviewAction.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.emailNotice.deleteMany();
  await prisma.researchProject.updateMany({
    data: { currentPhaseId: null, status: "ONGOING", finishedAt: null },
  });
  await prisma.checklistItem.deleteMany();
  await prisma.phase.deleteMany();
  for (const project of projects) {
    await rm(path.join(process.cwd(), "data", "uploads", project.id), { recursive: true, force: true });
  }

  const standard = await prisma.checklist.findUniqueOrThrow({ where: { type: "STANDARD" } });
  const funded = await prisma.checklist.findUniqueOrThrow({ where: { type: "PERSONALLY_FUNDED" } });
  const standardFirst = await install(standard.id, STANDARD_CHECKLIST);
  const fundedFirst = await install(funded.id, PERSONALLY_FUNDED_CHECKLIST);
  await prisma.researchProject.updateMany({
    where: { checklistId: standard.id },
    data: { currentPhaseId: standardFirst, status: "ONGOING", finishedAt: null },
  });
  await prisma.researchProject.updateMany({
    where: { checklistId: funded.id },
    data: { currentPhaseId: fundedFirst, status: "ONGOING", finishedAt: null },
  });
  console.log("Official checklists applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
