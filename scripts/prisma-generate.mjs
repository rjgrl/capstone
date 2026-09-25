import { spawnSync } from "node:child_process";
import { applyDatabaseEnv } from "./database-env.mjs";

process.env.PRISMA_HIDE_UPDATE_MESSAGE = "1";
applyDatabaseEnv({ allowPlaceholder: true });

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
