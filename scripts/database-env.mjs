import { existsSync, readFileSync } from "node:fs";

const PLACEHOLDER = "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";

function loadEnvFile() {
  if (!existsSync(".env")) return;

  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export function applyDatabaseEnv({ allowPlaceholder = false } = {}) {
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || "";
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
      process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || "";
  }

  if (!allowPlaceholder) return;

  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = PLACEHOLDER;
  if (!process.env.DIRECT_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;
}
