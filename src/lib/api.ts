import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getAuth, hasPermission, type AuthContext } from "@/lib/auth";
import type { PermissionKey } from "@/lib/constants";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth() {
  const auth = await getAuth();
  if (!auth) {
    throw new ApiError(401, "Sign in to continue.");
  }
  return auth;
}

export async function requirePermission(key: PermissionKey) {
  const auth = await requireAuth();
  if (!hasPermission(auth, key)) {
    throw new ApiError(403, "You do not have permission to do that.");
  }
  return auth;
}

export function assertPermission(auth: AuthContext, key: PermissionKey) {
  if (!hasPermission(auth, key)) {
    throw new ApiError(403, "You do not have permission to do that.");
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "A record with this value already exists." },
      { status: 409 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
