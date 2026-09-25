import { spawnSync } from "node:child_process";
import { applyDatabaseEnv } from "./database-env.mjs";

applyDatabaseEnv();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("placeholder:placeholder@")) {
  console.error(
    "The build could not find a Postgres connection string. In the Vercel capstone project, connect the Neon database, or set DATABASE_URL to the pooled Neon URL and DIRECT_URL to the direct Neon URL. Then redeploy.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env: { ...process.env, SEED_IF_EMPTY: "1" },
  shell: true,
});

process.exit(seed.status ?? 1);
