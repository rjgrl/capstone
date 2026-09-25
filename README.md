# Research and Development Unit

Tracks faculty and professor research from submission through completion. Department Heads review each phase against the documentary checklist. A researcher cannot move to the next phase, or start another study, while the current phase is incomplete.

## Database

The app uses PostgreSQL. A SQLite file does not keep data on Vercel, so both local runs and the Vercel deployment use a hosted Postgres database.

Create a Postgres database in the Vercel project (Storage → Create → Postgres) or on Neon. Then set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Pooled connection string (`POSTGRES_PRISMA_URL` when Vercel creates the database) |
| `DIRECT_URL` | Direct connection string (`DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING`). Use the same value as `DATABASE_URL` if there is only one URL. |
| `AUTH_SECRET` | A long random string, different from the local sample |

The production build runs `prisma migrate deploy` before `next build`, which creates the tables on an empty database. After the first deploy, seed the sample accounts once from your computer with those same URLs in `.env`:

```bash
npm run db:seed
```

Seeding replaces existing rows. Run it only on an empty database.

## Run locally

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000.

Copy `.env.example` to `.env` if the environment file is missing. Set `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`. Leave `SMTP_HOST` empty to keep email notices in the system, or set the SMTP values to send them.

## Sample accounts

Every sample account uses the password `Rdu-Admin-2026`.

| Role | Email |
| --- | --- |
| Super Admin | superadmin@rdu.local |
| Department Head, College of Technology | head.technology@rdu.local |
| Researcher | maria.santos@rdu.local |
| Researcher | juan.reyes@rdu.local |

The seven college departments from the system brief are seeded, along with one starter program in each department. The two documentary checklists use the official research phases and the personally-funded documentary requirements.

## Documents

Uploaded PDFs are stored in `data/uploads` and are served only to signed-in users who may view that Research Project. That folder is on the machine running the app. Vercel does not keep those files between requests, so PDF upload and viewing need separate file storage before they work in a Vercel deployment.
