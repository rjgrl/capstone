import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ApiError, jsonError, requirePermission } from "@/lib/api";
import { ROLE_KEYS } from "@/lib/constants";
import { passwordSchema, userSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requirePermission("users.manage");
    const [users, roles, departments, faculty] = await Promise.all([
      prisma.user.findMany({
        include: {
          role: true,
          department: true,
          faculty: { select: { id: true, firstName: true, lastName: true, institutionalEmail: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.department.findMany({ orderBy: { name: "asc" } }),
      prisma.faculty.findMany({
        orderBy: { lastName: "asc" },
        select: { id: true, firstName: true, lastName: true, institutionalEmail: true, userId: true, departmentId: true },
      }),
    ]);
    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roleId: user.roleId,
        roleName: user.role.name,
        roleKey: user.role.key,
        departmentId: user.departmentId,
        departmentName: user.department?.name ?? null,
        facultyId: user.faculty?.id ?? null,
        facultyName: user.faculty ? `${user.faculty.firstName} ${user.faculty.lastName}` : null,
        createdAt: user.createdAt,
      })),
      roles,
      departments,
      faculty,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("users.manage");
    const body = userSchema.parse(await request.json());
    if (!body.password) throw new ApiError(400, "Enter a password for the new account.");
    passwordSchema.parse(body.password);
    const role = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (!role) throw new ApiError(400, "Select a role.");
    if (role.key === ROLE_KEYS.DEPARTMENT_HEAD && !body.departmentId) {
      throw new ApiError(400, "A Department Head must be assigned to a department.");
    }
    if (role.key === ROLE_KEYS.RESEARCHER && !body.facultyId) {
      throw new ApiError(400, "A Researcher must be linked to a Faculty / Professor profile.");
    }
    if (role.key !== ROLE_KEYS.DEPARTMENT_HEAD && body.departmentId) {
      throw new ApiError(400, "Only a Department Head is assigned to a department account.");
    }

    let email = body.email.toLowerCase();
    if (body.facultyId) {
      const faculty = await prisma.faculty.findUnique({ where: { id: body.facultyId } });
      if (!faculty) throw new ApiError(400, "The Faculty / Professor profile could not be found.");
      if (faculty.userId) throw new ApiError(409, "That Faculty / Professor profile already has a user account.");
      if (faculty.institutionalEmail.toLowerCase() !== email) {
        throw new ApiError(400, "The user account email must match the Faculty / Professor institutional email.");
      }
      email = faculty.institutionalEmail.toLowerCase();
    }

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash: await bcrypt.hash(body.password, 12),
        roleId: role.id,
        departmentId: role.key === ROLE_KEYS.DEPARTMENT_HEAD ? body.departmentId : null,
        isActive: body.isActive ?? true,
        ...(body.facultyId ? { faculty: { connect: { id: body.facultyId } } } : {}),
      },
    });
    return NextResponse.json({ user: { id: user.id } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
