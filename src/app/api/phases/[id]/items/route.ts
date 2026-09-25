import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { checklistItemSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const phase = await prisma.phase.findUnique({ where: { id } });
    if (!phase) throw new ApiError(404, "The phase could not be found.");
    const body = checklistItemSchema.parse(await request.json());
    const item = await prisma.checklistItem.create({
      data: {
        phaseId: phase.id,
        name: body.name,
        description: body.description?.trim() || null,
        section: body.section?.trim() || null,
        isRequired: body.requiresFile ? body.isRequired : false,
        requiresFile: body.requiresFile,
        sequence: body.sequence,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
