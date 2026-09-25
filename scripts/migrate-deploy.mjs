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

process.exit(result.status ?? 1);
