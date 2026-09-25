import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { ROLE_KEYS } from "@/lib/constants";
import { permissionUpdateSchema } from "@/lib/validators";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    await requirePermission("rbac.assign");
    const { id } = await context.params;
    const body = permissionUpdateSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new ApiError(404, "The user could not be found.");

    const permissions = await prisma.permission.findMany();
    const byKey = new Map(permissions.map((permission) => [permission.key, permission]));
    for (const key of [...body.granted, ...body.revoked]) {
      if (!byKey.has(key)) throw new ApiError(400, "One of the selected functions does not exist.");
    }

    const revoked = new Set(body.revoked);
    if (
      user.role.key === ROLE_KEYS.SUPER_ADMIN &&
      user.isActive &&
      revoked.has("rbac.assign")
    ) {
      const others = await prisma.user.count({
        where: {
          id: { not: user.id },
          isActive: true,
          role: { key: ROLE_KEYS.SUPER_ADMIN },
          NOT: { userPermissions: { some: { granted: false, permission: { key: "rbac.assign" } } } },
        },
      });
      if (others === 0) {
        throw new ApiError(409, "The last Super Admin must keep the function that assigns and removes user access.");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId: user.id } });
      const rows = [
        ...body.granted
          .filter((key) => !revoked.has(key))
          .map((key) => ({ userId: user.id, permissionId: byKey.get(key)!.id, granted: true })),
        ...body.revoked.map((key) => ({
          userId: user.id,
          permissionId: byKey.get(key)!.id,
          granted: false,
        })),
      ];
      if (rows.length) await tx.userPermission.createMany({ data: rows });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
