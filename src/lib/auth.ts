import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth-token";
import { ROLE_KEYS, type PermissionKey, type RoleKey } from "@/lib/constants";

export type AuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    roleKey: RoleKey;
    roleName: string;
    departmentId: string | null;
    departmentName: string | null;
    facultyId: string | null;
    isActive: boolean;
  };
  permissions: Set<PermissionKey>;
};

export async function getAuth(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let session: { sub: string } | null = null;
  try {
    session = await verifySession(token);
  } catch {
    return null;
  }
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      role: { include: { rolePermissions: { include: { permission: true } } } },
      department: true,
      faculty: { select: { id: true } },
      userPermissions: { include: { permission: true } },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = new Set<PermissionKey>(
    user.role.rolePermissions.map((item) => item.permission.key as PermissionKey),
  );
  for (const override of user.userPermissions) {
    const key = override.permission.key as PermissionKey;
    if (override.granted) permissions.add(key);
    else permissions.delete(key);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleKey: user.role.key as RoleKey,
      roleName: user.role.name,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? null,
      facultyId: user.faculty?.id ?? null,
      isActive: user.isActive,
    },
    permissions,
  };
}

export function hasPermission(auth: AuthContext, key: PermissionKey) {
  return auth.permissions.has(key);
}

export function isSuperAdmin(auth: AuthContext) {
  return auth.user.roleKey === ROLE_KEYS.SUPER_ADMIN;
}

export function isDepartmentHead(auth: AuthContext) {
  return auth.user.roleKey === ROLE_KEYS.DEPARTMENT_HEAD;
}

export function isResearcher(auth: AuthContext) {
  return auth.user.roleKey === ROLE_KEYS.RESEARCHER;
}
