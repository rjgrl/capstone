import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { ROLE_KEYS } from "@/lib/constants";
import { passwordSchema, userSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

async function otherActiveSuperAdmins(userId: string) {
  return prisma.user.count({
    where: { id: { not: userId }, isActive: true, role: { key: ROLE_KEYS.SUPER_ADMIN } },
  });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const auth = await requirePermission("users.manage");
    const { id } = await context.params;
    const body = userSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { role: true, faculty: true },
    });
    if (!existing) throw new ApiError(404, "The user could not be found.");
    const role = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (!role) throw new ApiError(400, "Select a role.");

    const willBeActive = body.isActive ?? existing.isActive;
    if (existing.role.key === ROLE_KEYS.SUPER_ADMIN && (role.key !== ROLE_KEYS.SUPER_ADMIN || !willBeActive)) {
      if ((await otherActiveSuperAdmins(existing.id)) === 0) {
        throw new ApiError(409, "The last active Super Admin cannot be removed or deactivated.");
      }
    }
    if (role.key === ROLE_KEYS.DEPARTMENT_HEAD && !body.departmentId) {
      throw new ApiError(400, "A Department Head must be assigned to a department.");
    }
    if (role.key === ROLE_KEYS.RESEARCHER && !body.facultyId && !existing.faculty) {
      throw new ApiError(400, "A Researcher must be linked to a Faculty / Professor profile.");
    }

    let email = body.email.toLowerCase();
    const facultyId = body.facultyId || existing.faculty?.id || null;
    if (role.key === ROLE_KEYS.RESEARCHER) {
      if (!facultyId) throw new ApiError(400, "A Researcher must be linked to a Faculty / Professor profile.");
      const faculty = await prisma.faculty.findUnique({ where: { id: facultyId } });
      if (!faculty) throw new ApiError(400, "The Faculty / Professor profile could not be found.");
      if (faculty.userId && faculty.userId !== existing.id) {
        throw new ApiError(409, "That Faculty / Professor profile already has a user account.");
      }
      if (faculty.institutionalEmail.toLowerCase() !== email) {
        throw new ApiError(400, "The user account email must match the Faculty / Professor institutional email.");
      }
      email = faculty.institutionalEmail.toLowerCase();
    }

    if (body.password) passwordSchema.parse(body.password);
    if (auth.user.id === id && !willBeActive) {
      throw new ApiError(409, "You cannot deactivate the account you are using.");
    }

    await prisma.$transaction(async (tx) => {
      if (existing.faculty && existing.faculty.id !== facultyId) {
        await tx.faculty.update({ where: { id: existing.faculty.id }, data: { userId: null } });
      }
      await tx.user.update({
        where: { id },
        data: {
          name: body.name,
          email,
          roleId: role.id,
          departmentId: role.key === ROLE_KEYS.DEPARTMENT_HEAD ? body.departmentId : null,
          isActive: willBeActive,
          ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 12) } : {}),
        },
      });
      if (facultyId && role.key === ROLE_KEYS.RESEARCHER) {
        await tx.faculty.update({ where: { id: facultyId }, data: { userId: id } });
      }
      if (role.key !== ROLE_KEYS.RESEARCHER && existing.faculty) {
        await tx.faculty.update({ where: { id: existing.faculty.id }, data: { userId: null } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const auth = await requirePermission("users.manage");
    const { id } = await context.params;
    if (auth.user.id === id) throw new ApiError(409, "You cannot delete the account you are using.");
    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        _count: { select: { submissions: true, reviews: true } },
      },
    });
    if (!existing) throw new ApiError(404, "The user could not be found.");
    if (existing.role.key === ROLE_KEYS.SUPER_ADMIN && (await otherActiveSuperAdmins(existing.id)) === 0) {
      throw new ApiError(409, "The last active Super Admin cannot be deleted.");
    }
    if (existing._count.submissions || existing._count.reviews) {
      throw new ApiError(
        409,
        "This user has submission or review history and cannot be deleted. Mark the account inactive instead.",
      );
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
