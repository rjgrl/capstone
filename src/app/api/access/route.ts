import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants";

export async function GET() {
  try {
    await requirePermission("rbac.assign");
    const [roles, users] = await Promise.all([
      prisma.role.findMany({
        include: { rolePermissions: { include: { permission: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
          department: true,
          userPermissions: { include: { permission: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);
    return NextResponse.json({
      permissions: PERMISSIONS,
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.rolePermissions.map((item) => item.permission.key),
      })),
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
        roleKey: user.role.key,
        departmentName: user.department?.name ?? null,
        rolePermissions: user.role.rolePermissions.map((item) => item.permission.key),
        overrides: user.userPermissions.map((item) => ({
          key: item.permission.key,
          granted: item.granted,
        })),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
