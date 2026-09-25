import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { phaseSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requirePermission("checklists.manage");
    const { id } = await context.params;
    const checklist = await prisma.checklist.findUnique({ where: { id } });
    if (!checklist) throw new ApiError(404, "The checklist could not be found.");
    const body = phaseSchema.parse(await request.json());
    const phase = await prisma.phase.create({
      data: {
        checklistId: checklist.id,
        name: body.name,
        description: body.description,
        sequence: body.sequence,
      },
    });
    return NextResponse.json({ phase }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
